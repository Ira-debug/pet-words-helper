// app.js - 主逻辑（改进版）

(function() {
    // 存储键 - v2 版本（词库更新后清空旧数据）
    var KEYS = {
        WRONG_WORDS: 'pet_wrong_words_v2',
        LEARN_PROGRESS: 'pet_learn_progress_v2',
        STATS: 'pet_stats_v2',
        POINTS: 'pet_points_v2',
        LEARNED_WORDS_COUNT: 'pet_learned_count_v2',
        CLEARED_WRONG_COUNT: 'pet_cleared_wrong_count_v2'
    };

    // Emoji映射
    var emojiMap = {
        'apple': '🍎', 'banana': '🍌', 'cat': '🐱', 'dog': '🐶',
        'happy': '😊', 'jump': '🦘', 'run': '🏃', 'read': '📖',
        'write': '✏️', 'study': '📚', 'test': '📝', 'school': '🏫',
        'home': '🏠', 'family': '👨‍👩‍👧‍👦', 'friend': '🤝',
        'food': '🍕', 'water': '💧', 'sun': '☀️', 'moon': '🌙',
        'star': '⭐', 'heart': '❤️', 'book': '📚', 'music': '🎵',
        'sport': '⚽', 'travel': '🧳', 'time': '⏰', 'day': '📅',
        'morning': '🌅', 'night': '🌃', 'love': '💕', 'smile': '😀'
    };

    // 鼓励语
    var correctMsg = ['太棒了！🎉', '好厉害！⭐', '答对了！🌟', '真了不起！👍', '完美！✨', '你真聪明！🧠', '继续加油！💪'];
    var wrongMsg = ['没关系，加油！💪', '别担心！📚', '继续努力！🌈', '你可以的！🌻', '记住它哦！💡'];

    // 测试类型
    var TEST_TYPES = {
        CHOOSE_CHINESE: 'choose_chinese',  // 选中文
        CHOOSE_WORD: 'choose_word',        // 选英文
        MATCHING: 'matching'               // 连线题
    };

    // 应用状态
    var currentDir = null;
    var allWords = [];           // 目录全部单词（用于生成选项）
    var allWordsOriginal = [];   // 目录全部单词原始列表（复习时保留）
    var currentWords = [];       // 当前学习批次（未学习的）
    var learnedWords = [];       // 本次已学习的单词（用于测试）
    var previousWord = null;     // 上一个单词（用于左滑返回）
    var currentIndex = 0;        // 当前单词索引
    var currentWord = null;
    var sessionLearned = 0;      // 本次学习总数
    var sessionCorrect = 0;      // 本次正确数
    var sessionWrong = 0;        // 本次错误数
    var isReviewMode = false;
    var learnBatchSize = 3;      // 每学3个开始选择题测试
    var matchBatchSize = 6;      // 每学6个开始连线测试
    var currentTestIndex = 0;    // 当前测试索引
    var testWordsQueue = [];     // 待测试的单词队列
    var currentTestType = null;  // 当前测试类型
    var sessionLearnCount = 0;   // 本次累计学习单词数（用于判断连线测试）
    var dailyGoal = 30;          // 每日学习目标

    // 总错题库复习相关状态
    var isReviewAllWrongMode = false;  // 是否为总错题库复习模式
    var reviewWrongDirs = [];          // 正在复习的目录列表
    var wrongWordsClearedThisRound = 0; // 本轮复习消灭的错词数
    var wrongWordCorrectCount = {};    // 错词正确答题计数 {word: count}

    // 连线测试状态
    var matchWords = [];         // 连线测试的单词列表
    var matchConnections = {};   // 已建立的连线 {wordIndex: chineseIndex}
    var matchSelectedWord = null; // 当前选中的英文单词索引
    var matchSelectedChinese = null; // 当前选中的中文索引

    // ===== 发音功能 =====
    var currentPronounceText = '';  // 当前正在发音的文本

    function pronounce(text) {
        console.log('=== pronounce 被调用，文本:', text, '===');
        if (!('speechSynthesis' in window)) {
            console.log('speechSynthesis不可用');
            return;
        }

        // 如果正在发音同一文本，跳过
        if (currentPronounceText === text && window.speechSynthesis.speaking) {
            console.log('正在发音同一文本，跳过');
            return;
        }

        // 强制取消所有待发音的内容
        console.log('取消之前的发音，当前speaking状态:', window.speechSynthesis.speaking);
        window.speechSynthesis.cancel();
        currentPronounceText = text;

        // 创建 utterance
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;

        // 设置英语语音
        var voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            var enVoice = voices.find(function(v) { return v.lang === 'en-US'; });
            if (enVoice) utterance.voice = enVoice;
        }

        // 发音完成后清除记录
        utterance.onend = function() {
            console.log('=== 发音完成:', text, '===');
            currentPronounceText = '';
        };
        utterance.onerror = function(e) {
            console.log('=== 发音错误:', text, e, '===');
            currentPronounceText = '';
        };

        // 发音
        console.log('开始发音:', text);
        window.speechSynthesis.speak(utterance);
    }

    // 定期调用 resume 保持引擎活跃（Chrome bug修复）- 可能导致发音错乱，已移除
    // 改用每次发音时直接处理

    // 错误提示音
    function playErrorSound() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 200;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {}
    }

    // 成功提示音
    function playSuccessSound() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
    }

    // 欢呼庆祝音效（连续上升的音符）
    function playCelebrationSound() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach(function(freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                var startTime = ctx.currentTime + i * 0.15;
                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                osc.start(startTime);
                osc.stop(startTime + 0.3);
            });
        } catch (e) {}
    }

    // 掌声音效
    function playApplauseSound() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            // 模拟掌声 - 多个短促的随机频率
            for (var i = 0; i < 20; i++) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 200 + Math.random() * 400;
                osc.type = 'sawtooth';
                var startTime = ctx.currentTime + i * 0.05 + Math.random() * 0.02;
                gain.gain.setValueAtTime(0.1, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
                osc.start(startTime);
                osc.stop(startTime + 0.08);
            }
        } catch (e) {}
    }

    // 初始化语音
    function initSpeech() {
        if (!('speechSynthesis' in window)) return;

        // 加载语音列表
        window.speechSynthesis.getVoices();

        // 监听语音变化
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.getVoices();
        };

        // 预热引擎
        window.speechSynthesis.resume();
    }

    // ===== 工具函数 =====
    function getTodayKey() {
        var today = new Date();
        return 'pet_daily_' + today.getFullYear() + '_' + (today.getMonth() + 1) + '_' + today.getDate();
    }

    // 按难度排序错词（错误次数多的优先，正确次数少的更难）
    function sortWrongWordsByDifficulty(wrongWords) {
        return wrongWords.slice().sort(function(a, b) {
            // 主要按错误次数降序（错误多的更难）
            var wrongA = a.wrongCount || 0;
            var wrongB = b.wrongCount || 0;
            if (wrongA !== wrongB) return wrongB - wrongA;

            // 其次按正确次数升序（正确少的更难）
            var correctA = a.correctCount || 0;
            var correctB = b.correctCount || 0;
            if (correctA !== correctB) return correctA - correctB;

            // 最后按加入时间（早加入的优先）
            return (a.wrongTime || 0) - (b.wrongTime || 0);
        });
    }

    function getTodayLearned() {
        var key = getTodayKey();
        var data = localStorage.getItem(key);
        return data ? parseInt(data) : 0;
    }

    function addTodayLearned(count) {
        var key = getTodayKey();
        var current = getTodayLearned();
        localStorage.setItem(key, current + count);
        return current + count;
    }

    function getEmoji(word) {
        var w = word.toLowerCase().split(' ')[0];
        return emojiMap[w] || '📖';
    }

    function randomMsg(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function shuffle(arr) {
        var result = arr.slice();
        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = result[i];
            result[i] = result[j];
            result[j] = tmp;
        }
        return result;
    }

    function save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function load(key) {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // ===== 存储相关 =====
    function getWrongWords(dir) {
        var wrong = load(KEYS.WRONG_WORDS) || {};
        return wrong[dir] || [];
    }

    function addWrongWord(dir, word) {
        var wrong = load(KEYS.WRONG_WORDS) || {};
        if (!wrong[dir]) wrong[dir] = [];

        var exists = wrong[dir].find(function(w) { return w.word === word.word; });
        if (!exists) {
            wrong[dir].push({
                word: word.word,
                chinese: word.chinese,
                wrongTime: Date.now()
            });
        }
        save(KEYS.WRONG_WORDS, wrong);
    }

    function removeWrongWord(dir, word) {
        var wrong = load(KEYS.WRONG_WORDS) || {};
        if (wrong[dir]) {
            wrong[dir] = wrong[dir].filter(function(w) { return w.word !== word.word; });
        }
        save(KEYS.WRONG_WORDS, wrong);
    }

    function getProgress(dir) {
        var progress = load(KEYS.LEARN_PROGRESS) || {};
        return progress[dir] || 0;
    }

    function saveProgress(dir, index) {
        var progress = load(KEYS.LEARN_PROGRESS) || {};
        progress[dir] = index;
        save(KEYS.LEARN_PROGRESS, progress);
    }

    function updateStats(correct) {
        var stats = load(KEYS.STATS) || { total: 0, correct: 0 };
        stats.total++;
        if (correct) stats.correct++;
        save(KEYS.STATS, stats);
    }

    // ===== 积分系统 =====
    function getPoints() {
        return load(KEYS.POINTS) || 0;
    }

    function addPoints(amount, reason) {
        var current = getPoints();
        save(KEYS.POINTS, current + amount);
        updatePointsDisplay();
        showPointsReward(amount, reason);
        return current + amount;
    }

    function updatePointsDisplay() {
        var pointsEl = document.getElementById('totalPoints');
        if (pointsEl) {
            pointsEl.textContent = getPoints();
        }
        // 更新顶部总错词数
        var wrongEl = document.getElementById('topWrongCount');
        if (wrongEl) {
            var count = getAllWrongCount();
            wrongEl.textContent = count;
            wrongEl.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    // 累计学习单词数（用于30单词积分）
    function getLearnedWordsCount() {
        return load(KEYS.LEARNED_WORDS_COUNT) || 0;
    }

    function addLearnedWordsCount(count) {
        var current = getLearnedWordsCount();
        save(KEYS.LEARNED_WORDS_COUNT, current + count);
        return current + count;
    }

    // 累计消灭错词数（用于20错词积分）
    function getClearedWrongCount() {
        return load(KEYS.CLEARED_WRONG_COUNT) || 0;
    }

    function addClearedWrongCount(count) {
        var current = getClearedWrongCount();
        save(KEYS.CLEARED_WRONG_COUNT, current + count);
        return current + count;
    }

    // 显示积分奖励弹窗
    function showPointsReward(amount, reason) {
        document.getElementById('pointsEarned').textContent = amount;
        document.getElementById('pointsReason').textContent = reason;
        document.getElementById('pointsAfterEarn').textContent = getPoints();
        showModal('pointsModal');

        // 播放庆祝音效
        playCelebrationSound();
    }

    // 获取所有目录的错词总数
    function getAllWrongCount() {
        var wrong = load(KEYS.WRONG_WORDS) || {};
        var total = 0;
        Object.keys(wrong).forEach(function(dir) {
            total += (wrong[dir] || []).length;
        });
        return total;
    }

    // 获取所有错词列表（合并所有目录）
    function getAllWrongWords() {
        var wrong = load(KEYS.WRONG_WORDS) || {};
        var allWrong = [];
        Object.keys(wrong).forEach(function(dir) {
            (wrong[dir] || []).forEach(function(w) {
                // 添加目录信息
                allWrong.push({
                    word: w.word,
                    chinese: w.chinese,
                    dir: dir,
                    wrongTime: w.wrongTime,
                    wrongCount: w.wrongCount || 0,  // 错误次数
                    correctCount: w.correctCount || 0  // 正确次数
                });
            });
        });
        return allWrong;
    }

    // 检查错词是否被消灭（一次性答对或错后连对2次）
    function checkWrongWordCleared(wordObj, isCorrect) {
        if (!wordObj) return false;

        // 获取该错词的当前状态
        var wordKey = wordObj.word;
        var currentCorrectCount = wrongWordCorrectCount[wordKey] || 0;

        if (isCorrect) {
            currentCorrectCount++;
            wrongWordCorrectCount[wordKey] = currentCorrectCount;

            // 检查是否满足消灭条件
            // 如果之前没有答错记录（wrongCount=0），一次正确就消灭
            // 如果之前答错过，需要连对2次才消灭
            var wrongCount = wordObj.wrongCount || 0;
            if (wrongCount === 0 && currentCorrectCount >= 1) {
                return true;  // 一次性答对，消灭
            } else if (wrongCount > 0 && currentCorrectCount >= 2) {
                return true;  // 错后连对2次，消灭
            }
        } else {
            // 答错了，重置正确计数，增加错误计数
            wrongWordCorrectCount[wordKey] = 0;
            wordObj.wrongCount = (wordObj.wrongCount || 0) + 1;
        }

        return false;
    }

    // ===== 页面显示 =====
    function showPage(pageId) {
        var pages = document.querySelectorAll('.page');
        pages.forEach(function(p) { p.classList.remove('active'); });
        document.getElementById('page-' + pageId).classList.add('active');

        // 顶部功能区只在首页显示
        var topBar = document.querySelector('.top-bar');
        if (topBar) {
            if (pageId === 'home') {
                topBar.style.display = 'flex';
            } else {
                topBar.style.display = 'none';
            }
        }
    }

    function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
    function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

    // ===== 进度条 =====
    // 学习页面的进度条显示：目录总进度
    function updateLearnProgress() {
        var total = allWords.length;
        var learned = currentIndex;  // 已学过的单词数
        var percent = total > 0 ? (learned / total) * 100 : 0;
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = learned + ' / ' + total;
    }

    // 测试页面的进度条显示：本轮测试进度
    function updateTestProgress() {
        var total = testWordsQueue.length;
        var current = currentTestIndex + 1;
        var percent = total > 0 ? (current / total) * 100 : 0;
        document.getElementById('testProgressFill').style.width = percent + '%';
        document.getElementById('testProgressText').textContent = current + ' / ' + total;
    }

    // ===== 目录解析与分组 =====
    // 解析目录名称，提取版本和测试部分
    function parseDirName(dirName) {
        // 格式示例:
        // "全真模拟题 Test1" -> version: "全真模拟题", test: "Test1"
        // "青少版1 Test1 阅读Part1" -> version: "青少版1", test: "Test1 阅读Part1"
        // "标准版1 Test3 阅读" -> version: "标准版1", test: "Test3 阅读"

        var parts = dirName.split(' ');
        if (parts.length >= 2) {
            var version = parts[0];
            var test = parts.slice(1).join(' ');
            return { version: version, test: test, fullName: dirName };
        }
        return { version: dirName, test: '', fullName: dirName };
    }

    // 获取所有版本的分组
    function getVersionGroups() {
        var groups = {};
        Object.keys(PET_WORDS.level2_dirs).forEach(function(dir) {
            var parsed = parseDirName(dir);
            if (!groups[parsed.version]) {
                groups[parsed.version] = {
                    name: parsed.version,
                    tests: [],
                    totalWords: 0,
                    totalWrong: 0
                };
            }
            var words = PET_WORDS.level2_dirs[dir];
            groups[parsed.version].tests.push({
                name: parsed.test,
                fullName: dir,
                wordCount: words.length
            });
            groups[parsed.version].totalWords += words.length;
        });
        return groups;
    }

    // ===== 目录渲染 - 全部展开显示 =====
    function renderDirs() {
        var container = document.getElementById('versionGroups');
        var wrongData = load(KEYS.WRONG_WORDS) || {};
        var progressData = load(KEYS.LEARN_PROGRESS) || {};
        var groups = getVersionGroups();

        // 计算每个版本的总错词数和总进度
        Object.keys(groups).forEach(function(version) {
            groups[version].totalWrong = 0;
            groups[version].totalLearned = 0;
            groups[version].tests.forEach(function(test) {
                groups[version].totalWrong += (wrongData[test.fullName] || []).length;
                var learned = progressData[test.fullName] || 0;
                groups[version].totalLearned += learned;
            });
        });

        // 渲染所有版本分组 - 默认全部展开
        var html = '';
        Object.keys(groups).forEach(function(version) {
            var group = groups[version];

            // 版本标题栏
            html += '<div class="version-group">';
            html += '<div class="version-header">';
            html += '<div class="version-title">';
            html += '<span class="version-name">' + version + '</span>';
            html += '<span class="version-info">' + group.totalLearned + '/' + group.totalWords + '词 · ' + group.tests.length + '部分</span>';
            if (group.totalWrong > 0) {
                html += '<span class="version-wrong">' + group.totalWrong + '错</span>';
            }
            html += '</div>';
            html += '</div>';

            // 测试部分列表 - 始终展开
            html += '<div class="tests-list">';
            group.tests.forEach(function(test) {
                var wrongCount = (wrongData[test.fullName] || []).length;
                var learned = progressData[test.fullName] || 0;
                var total = test.wordCount;
                var isCompleted = learned >= total;

                // 已完成的卡片添加 completed 类
                var itemClass = 'test-item' + (isCompleted ? ' completed' : '');
                html += '<div class="' + itemClass + '" data-dir="' + test.fullName + '">';
                html += '<span class="test-name">' + test.name + '</span>';
                html += '<span class="test-progress">' + learned + '/' + total + '</span>';
                if (wrongCount > 0) {
                    html += '<span class="test-wrong">' + wrongCount + '错</span>';
                }
                if (isCompleted) {
                    html += '<span class="test-done">✓</span>';
                }
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });

        container.innerHTML = html;

        // 绑定测试部分点击事件
        container.querySelectorAll('.test-item').forEach(function(item) {
            item.addEventListener('click', function() {
                selectDir(item.dataset.dir);
            });
        });
    }

    // ===== 选择目录 =====
    function selectDir(dir) {
        currentDir = dir;
        allWords = PET_WORDS.level2_dirs[dir].slice();  // 复制一份
        allWordsOriginal = allWords.slice();  // 保存原始列表（复习时用）
        currentIndex = getProgress(dir);

        // 如果已完成，重置
        if (currentIndex >= allWords.length) {
            currentIndex = 0;
            saveProgress(dir, 0);
        }

        // 设置当前学习批次
        currentWords = allWords.slice(currentIndex);
        learnedWords = [];
        testWordsQueue = [];
        currentTestIndex = 0;

        sessionLearned = 0;
        sessionCorrect = 0;
        sessionWrong = 0;
        sessionLearnCount = 0;  // 重置累计学习计数
        needMatchAfterTest = false;  // 重置连线测试标记
        isReviewMode = false;

        // 确保显示学习区域（隐藏测试区域）
        document.getElementById('learnArea').classList.remove('hidden');
        document.getElementById('testArea').classList.add('hidden');
        document.getElementById('matchArea').classList.add('hidden');

        // 检查错词
        var wrongWords = getWrongWords(dir);
        if (wrongWords.length > 0) {
            document.getElementById('reviewHint').classList.remove('hidden');
            document.getElementById('wrongWordCount').textContent = wrongWords.length;
        } else {
            document.getElementById('reviewHint').classList.add('hidden');
        }

        showPage('learn');
        showNextWordToLearn();
    }

    // 复习错词
    function startReviewWrong() {
        var wrongWords = getWrongWords(currentDir);
        if (wrongWords.length === 0) {
            alert('太棒了！没有错词！');
            return;
        }

        isReviewMode = true;
        isReviewAllWrongMode = false;  // 单目录复习模式
        reviewWrongDirs = [currentDir];

        // 重置错词正确计数
        wrongWordCorrectCount = {};

        // 获取错词详细信息并按难度排序
        var wrongData = load(KEYS.WRONG_WORDS) || {};
        var dirWrongData = wrongData[currentDir] || [];

        // 复习时：currentWords为错词（按难度排序），但allWords保持为原始目录单词（用于生成选项）
        var sortedWrongData = sortWrongWordsByDifficulty(dirWrongData);
        currentWords = sortedWrongData.map(function(w) {
            return {
                word: w.word,
                chinese: w.chinese,
                wrongTime: w.wrongTime,
                wrongCount: w.wrongCount || 0,
                correctCount: w.correctCount || 0
            };
        });
        allWords = PET_WORDS.level2_dirs[currentDir].slice();  // 原始目录单词用于生成选项
        allWordsOriginal = allWords.slice();
        learnedWords = [];
        currentIndex = 0;
        currentTestIndex = 0;
        testWordsQueue = [];
        sessionLearned = 0;
        sessionCorrect = 0;
        sessionWrong = 0;
        sessionLearnCount = 0;
        needMatchAfterTest = false;
        wrongWordsClearedThisRound = 0;

        showPage('learn');
        showNextWordToLearn();
    }

    // ===== 左滑手势返回上一单词 =====
    function setupSwipeGesture() {
        var learnArea = document.getElementById('learnArea');
        var touchStartX = 0;
        var touchEndX = 0;
        var minSwipeDistance = 80; // 最小滑动距离

        learnArea.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        learnArea.addEventListener('touchmove', function(e) {
            touchEndX = e.touches[0].clientX;
        }, { passive: true });

        learnArea.addEventListener('touchend', function(e) {
            var swipeDistance = touchEndX - touchStartX;

            // 左滑：从右向左（距离为负数）
            if (swipeDistance < -minSwipeDistance) {
                goBackToPreviousWord();
            }
        }, { passive: true });

        // 重置触摸坐标
        touchStartX = 0;
        touchEndX = 0;
    }

    // 返回上一个单词
    function goBackToPreviousWord() {
        console.log('=== goBackToPreviousWord 被调用！===');
        console.log('previousWord:', previousWord ? previousWord.word : 'null');
        console.trace('调用来源');

        if (!previousWord) {
            // 没有上一个单词
            console.log('没有上一个单词，返回');
            return;
        }

        // 将当前单词重新放回队列前面
        if (currentWord) {
            currentWords.unshift(currentWord);
            currentIndex--;
            sessionLearned--;
            sessionLearnCount--;

            // 从已学习队列移除
            var idx = learnedWords.indexOf(currentWord);
            if (idx > -1) {
                learnedWords.splice(idx, 1);
            }

            // 如果是错词，也要移除（如果是刚标记的）
            // 这里简化处理：只恢复到上一个单词显示
        }

        // 显示上一个单词
        currentWord = previousWord;
        previousWord = null; // 清空，防止重复返回
        showWordCard(currentWord);
        updateLearnProgress();
    }

    // ===== 学习流程 =====
    function showNextWordToLearn() {
        console.log('=== showNextWordToLearn 被调用 ===');
        console.log('currentWords剩余数量:', currentWords.length);
        console.log('currentWords内容:', currentWords.map(function(w) { return w.word; }));

        if (currentWords.length === 0) {
            // 没有更多单词了，显示完成页面
            showComplete();
            return;
        }

        // 记录当前单词作为上一个单词（用于左滑返回）
        if (currentWord) {
            previousWord = currentWord;
            console.log('上一个单词:', previousWord.word);
        }

        currentWord = currentWords[0];
        console.log('准备显示单词:', currentWord.word);
        console.log('调用showWordCard前，wordTitle内容:', document.getElementById('wordTitle').textContent);

        showWordCard(currentWord);
        updateLearnProgress();

        console.log('调用showWordCard后，wordTitle内容:', document.getElementById('wordTitle').textContent);
    }

    function showWordCard(word) {
        console.log('=== showWordCard 被调用，单词:', word.word, '===');
        console.trace('调用来源');  // 显示调用栈
        document.getElementById('wordTitle').textContent = word.word;
        document.getElementById('wordChinese').textContent = word.chinese + ' ' + getEmoji(word.word);

        // 发音
        pronounce(word.word);
        console.log('=== showWordCard 完成 ===');
    }

    // 记住了 - 加入学习队列
    var isLearningInProgress = false;  // 防止重复点击的锁

    function onRemembered() {
        // 如果正在处理中，忽略点击
        if (isLearningInProgress) {
            console.log('=== 学习正在进行，忽略重复点击 ===');
            return;
        }
        isLearningInProgress = true;  // 设置锁

        console.log('=== onRemembered 被调用 ===');
        if (!currentWord) {
            console.log('ERROR: currentWord为空');
            isLearningInProgress = false;
            return;
        }

        console.log('当前单词:', currentWord.word);
        console.log('当前currentIndex:', currentIndex);

        // 加入已学习队列
        learnedWords.push(currentWord);

        // 从待学习队列移除
        currentWords.shift();
        currentIndex++;
        sessionLearned++;
        sessionLearnCount++;  // 累计学习数

        console.log('移除后currentWords剩余:', currentWords.length);
        console.log('移除后currentWords:', currentWords.map(function(w) { return w.word; }));
        console.log('新的currentIndex:', currentIndex);

        // DEBUG: 打印学习流程
        console.log('=== 学习进度 ===');
        console.log('刚学会单词:', currentWord.word);
        console.log('已学习队列长度:', learnedWords.length, '需要达到', learnBatchSize, '才测试');
        console.log('已学习队列:', learnedWords.map(function(w) { return w.word; }));

        if (!isReviewMode) {
            saveProgress(currentDir, currentIndex);
        }

        // 检查是否需要开始测试（每3个进行选择题测试）
        if (learnedWords.length >= learnBatchSize) {
            console.log('>>> 达到测试阈值，开始测试');
            // 检查是否同时也需要连线测试（每6个）
            if (sessionLearnCount >= matchBatchSize) {
                // 先选择题测试，然后连线测试
                startTestSession(true);  // true表示测试后需要连线
            } else {
                startTestSession(false);
            }
        } else if (currentWords.length === 0) {
            // 没有更多单词了，不足3个就直接结束
            console.log('>>> 没有更多单词，直接结束');
            showComplete();
        } else {
            // 继续学习
            console.log('>>> 继续学习下一个单词');
            showNextWordToLearn();
        }

        // 释放锁（延迟释放，确保页面已更新）
        setTimeout(function() {
            isLearningInProgress = false;
        }, 300);
    }

    // 不确定 - 加入错词，继续学习
    function onNotSure() {
        // 如果正在处理中，忽略点击
        if (isLearningInProgress) {
            console.log('=== 学习正在进行，忽略重复点击 ===');
            return;
        }
        isLearningInProgress = true;

        if (!currentWord) {
            isLearningInProgress = false;
            return;
        }

        addWrongWord(currentDir, currentWord);
        sessionWrong++;

        // 加入已学习队列（也要测试）
        learnedWords.push(currentWord);

        // 从待学习队列移除
        currentWords.shift();
        currentIndex++;
        sessionLearned++;
        sessionLearnCount++;  // 累计学习数

        if (!isReviewMode) {
            saveProgress(currentDir, currentIndex);
        }

        // 检查是否需要开始测试
        if (learnedWords.length >= learnBatchSize) {
            if (sessionLearnCount >= matchBatchSize) {
                startTestSession(true);
            } else {
                startTestSession(false);
            }
        } else if (currentWords.length === 0) {
            // 没有更多单词了，不足3个就直接结束
            showComplete();
        } else {
            showNextWordToLearn();
        }

        // 释放锁
        setTimeout(function() {
            isLearningInProgress = false;
        }, 300);
    }

    // ===== 测试流程 =====
    var needMatchAfterTest = false;  // 测试后是否需要连线测试

    function startTestSession(needMatch) {
        console.log('=== 开始测试会话 ===');
        console.log('已学习单词数:', learnedWords.length);
        console.log('是否需要连线测试:', needMatch);

        if (learnedWords.length === 0) {
            if (needMatch) {
                startMatchTest();
            } else {
                showComplete();
            }
            return;
        }

        // 记录是否需要连线测试
        needMatchAfterTest = needMatch;

        // 复制已学习的单词作为测试队列
        testWordsQueue = learnedWords.slice();
        currentTestIndex = 0;

        // 显示测试区域，隐藏学习区域（同一页面切换）
        document.getElementById('learnArea').classList.add('hidden');
        document.getElementById('testArea').classList.remove('hidden');
        document.getElementById('matchArea').classList.add('hidden');

        showNextTest();
    }

    function showNextTest() {
        // 释放测试锁，允许新的点击
        isTestInProgress = false;

        if (currentTestIndex >= testWordsQueue.length) {
            // 测试完成
            learnedWords = [];  // 清空已学习队列
            testWordsQueue = [];  // 清空测试队列
            currentTestIndex = 0;

            // 判断下一步
            if (needMatchAfterTest) {
                // 需要进行连线测试
                sessionLearnCount = 0;  // 重置累计计数
                startMatchTest();
            } else {
                // 切回学习区域，继续学习新单词
                document.getElementById('testArea').classList.add('hidden');
                document.getElementById('learnArea').classList.remove('hidden');
                showNextWordToLearn();
            }
            return;
        }

        currentWord = testWordsQueue[currentTestIndex];
        testAttemptCount = 0;

        // DEBUG: 打印测试流程
        console.log('=== 测试开始 ===');
        console.log('当前测试索引:', currentTestIndex, '/', testWordsQueue.length);
        console.log('当前单词:', currentWord.word);
        console.log('测试队列:', testWordsQueue.map(function(w) { return w.word; }));

        // 固定测试类型为英译中
        currentTestType = TEST_TYPES.CHOOSE_CHINESE;

        updateTestProgress();

        // 清空反馈区域
        document.getElementById('testFeedbackArea').innerHTML = '';

        // 强制清除testHintEl的颜色状态
        var testHintEl = document.getElementById('testHint');
        if (testHintEl) {
            testHintEl.style.color = '#888';
        }

        // 显示测试内容
        renderTestContent();
    }

    function renderTestContent() {
        var testWordEl = document.getElementById('testWord');
        var testHintEl = document.getElementById('testHint');
        var optionsEl = document.getElementById('testOptions');

        // 先清除任何残留的样式状态
        optionsEl.querySelectorAll('.test-option').forEach(function(opt) {
            opt.classList.remove('selected', 'correct', 'wrong');
            opt.style.pointerEvents = 'auto';
        });

        // 清空选项容器，确保没有任何遗留状态
        optionsEl.innerHTML = '';

        // 强制触发repaint，确保样式完全清除
        optionsEl.style.display = 'none';
        optionsEl.offsetHeight;  // 触发reflow
        optionsEl.style.display = '';

        if (currentTestType === TEST_TYPES.CHOOSE_CHINESE) {
            testWordEl.textContent = currentWord.word;
            testHintEl.textContent = '选出正确的中文意思哦~';

            // 直接发音，不延迟
            pronounce(currentWord.word);

            // 生成中文选项（每次随机不同的干扰项）
            var options = [currentWord.chinese];
            // 使用原始目录单词列表生成干扰选项（复习时也能有足够选项）
            var poolWords = allWordsOriginal.length > 0 ? allWordsOriginal : allWords;
            // 过滤掉当前词，并随机选取干扰项
            var otherWords = shuffle(poolWords.filter(function(w) { return w.word !== currentWord.word && w.chinese !== currentWord.chinese; }));
            for (var i = 0; i < Math.min(3, otherWords.length); i++) {
                options.push(otherWords[i].chinese);
            }
            // 如果选项不足，添加随机生成的选项
            while (options.length < 4) {
                var fakeOption = ['其他意思', '另一种', '不太对', '错误选项'][options.length - 1];
                if (!options.includes(fakeOption)) {
                    options.push(fakeOption);
                }
            }
            // 再次随机打乱选项顺序
            options = shuffle(options);

            var html = options.map(function(opt, idx) {
                return '<div class="test-option" data-answer="' + opt + '">' + opt + '</div>';
            }).join('');
            optionsEl.innerHTML = html;

            // 清除任何可能的选中状态和focus状态，以及内联样式
            optionsEl.querySelectorAll('.test-option').forEach(function(opt) {
                opt.classList.remove('selected', 'correct', 'wrong');
                // 强制清除所有内联样式（移动端hover残留）
                opt.style.backgroundColor = '';
                opt.style.borderColor = '';
                opt.style.color = '';
                opt.style.transform = '';
                opt.style.boxShadow = '';
                opt.style.pointerEvents = 'auto';
            });
            // 清除当前focus状态
            if (document.activeElement) {
                document.activeElement.blur();
            }

        } else {
            // 选英文单词
            testWordEl.textContent = currentWord.chinese;
            testHintEl.textContent = '选出正确的英文单词哦~';

            var options = [currentWord.word];
            // 使用原始目录单词列表生成干扰选项
            var poolWords = allWordsOriginal.length > 0 ? allWordsOriginal : allWords;
            // 过滤掉当前词，并随机选取干扰项
            var otherWords = shuffle(poolWords.filter(function(w) { return w.word !== currentWord.word && w.chinese !== currentWord.chinese; }));
            for (var i = 0; i < Math.min(3, otherWords.length); i++) {
                options.push(otherWords[i].word);
            }
            // 如果选项不足，添加随机生成的选项
            while (options.length < 4) {
                var fakeOption = ['another', 'different', 'wrong', 'otherword'][options.length - 1];
                if (!options.includes(fakeOption)) {
                    options.push(fakeOption);
                }
            }
            // 再次随机打乱选项顺序
            options = shuffle(options);

            var html = options.map(function(opt, idx) {
                return '<div class="test-option" data-answer="' + opt + '">' + opt + '</div>';
            }).join('');
            optionsEl.innerHTML = html;

            // 清除任何可能的选中状态和focus状态
            optionsEl.querySelectorAll('.test-option').forEach(function(opt) {
                opt.classList.remove('selected', 'correct', 'wrong');
            });
            // 清除当前focus状态
            if (document.activeElement && document.activeElement.classList.contains('test-option')) {
                document.activeElement.blur();
            }
        }
    }

    // ===== 测试结果反馈（在测试页面直接显示） =====
    var testAttemptCount = 0;
    var isTestInProgress = false;  // 防止重复点击的锁

    function showTestFeedback(isCorrect, wrongOption) {
        // 如果正在处理中，不重复执行
        if (isTestInProgress) {
            console.log('=== 测试正在进行，忽略重复点击 ===');
            return;
        }

        if (isCorrect) {
            isTestInProgress = true;  // 设置锁，防止重复点击
        }
        var feedbackArea = document.getElementById('testFeedbackArea');
        var testHintEl = document.getElementById('testHint');

        if (isCorrect) {
            // 正确 - 播放成功音效
            playSuccessSound();

            // 立即清除所有选项的选中状态，只保留correct状态
            document.querySelectorAll('.test-option').forEach(function(opt) {
                opt.classList.remove('selected');
            });

            // 显示成功反馈（不需要按钮）
            feedbackArea.innerHTML = '<div class="test-feedback correct">' +
                '<div class="feedback-icon">🎉</div>' +
                '<div class="feedback-text">' + randomMsg(correctMsg) + '</div>' +
                '</div>';

            // 禁用所有选项
            document.querySelectorAll('.test-option').forEach(function(opt) {
                opt.style.pointerEvents = 'none';
            });

            // 读一遍单词发音
            pronounce(currentWord.word);

            // 1.5秒后自动跳到下一题
            setTimeout(function() {
                console.log('=== 答对，进入下一题 ===');
                console.log('当前索引从', currentTestIndex, '增加到', currentTestIndex + 1);
                console.log('下一个单词:', testWordsQueue[currentTestIndex + 1] ? testWordsQueue[currentTestIndex + 1].word : '测试结束');

                // 先清除当前选项的所有样式状态
                document.querySelectorAll('.test-option').forEach(function(opt) {
                    opt.classList.remove('correct', 'wrong', 'selected');
                    opt.style.pointerEvents = 'auto';
                });

                sessionCorrect++;
                updateStats(true);
                if (isReviewMode) {
                    // 检查是否消灭该错词
                    var cleared = checkWrongWordCleared(currentWord, true);
                    if (cleared) {
                        wrongWordsClearedThisRound++;
                        // 移除错词（支持总错题库模式）
                        if (isReviewAllWrongMode && currentWord.dir) {
                            removeWrongWord(currentWord.dir, currentWord);
                        } else {
                            removeWrongWord(currentDir, currentWord);
                        }
                        // 清除该词的计数记录
                        delete wrongWordCorrectCount[currentWord.word];
                    } else {
                        // 未消灭，更新错词数据
                        updateWrongWordData(currentWord);
                    }
                }
                currentTestIndex++;
                showNextTest();
            }, 1500);

        } else {
            // 错误 - 播放错误提示音
            playErrorSound();

            testAttemptCount++;
            sessionWrong++;

            // 复习模式下，标记答错，重置正确计数
            if (isReviewMode) {
                checkWrongWordCleared(currentWord, false);
                // 更新错词数据
                updateWrongWordData(currentWord);
            } else {
                addWrongWord(currentDir, currentWord);
            }

            if (wrongOption) {
                wrongOption.classList.add('wrong');
                setTimeout(function() {
                    wrongOption.classList.remove('wrong');
                }, 1000);
            }

            testHintEl.textContent = '❌ 不对哦，再想想！';
            testHintEl.style.color = '#f44336';

            setTimeout(function() {
                if (currentTestType === TEST_TYPES.CHOOSE_CHINESE) {
                    testHintEl.textContent = '选出正确的中文意思哦~';
                } else {
                    testHintEl.textContent = '选出正确的英文单词哦~';
                }
                testHintEl.style.color = '#888';
            }, 1500);
        }
    }

    // 更新错词数据（保存错误次数和正确次数）
    function updateWrongWordData(wordObj) {
        var wrong = load(KEYS.WRONG_WORDS) || {};
        var dir = isReviewAllWrongMode ? wordObj.dir : currentDir;

        if (!wrong[dir]) wrong[dir] = [];

        var existing = wrong[dir].find(function(w) { return w.word === wordObj.word; });
        if (existing) {
            existing.wrongCount = wordObj.wrongCount || existing.wrongCount || 0;
            existing.correctCount = wrongWordCorrectCount[wordObj.word] || 0;
        }
        save(KEYS.WRONG_WORDS, wrong);
    }

    // ===== 连线测试 =====
    function startMatchTest() {
        // 使用最近学习的单词
        if (isReviewMode) {
            // 复习模式：从错词列表中选取
            matchWords = currentWords.slice(0, Math.min(6, currentWords.length));
        } else {
            // 正常模式：从已学习单词中选取最近6个
            var startIndex = currentIndex - matchBatchSize;
            if (startIndex < 0) startIndex = 0;
            matchWords = allWords.slice(startIndex, currentIndex);

            // 如果不足4个单词，从当前目录补充
            if (matchWords.length < 4 && currentWords.length > 0) {
                var need = 4 - matchWords.length;
                var extra = currentWords.slice(0, need);
                matchWords = matchWords.concat(extra);
            }
        }

        matchConnections = {};
        matchSelectedWord = null;
        matchSelectedChinese = null;

        // 显示连线区域，隐藏学习区域
        document.getElementById('learnArea').classList.add('hidden');
        document.getElementById('testArea').classList.add('hidden');
        document.getElementById('matchArea').classList.remove('hidden');

        renderMatchTest();
    }

    function renderMatchTest() {
        var wordsEl = document.getElementById('matchWords');
        var chineseEl = document.getElementById('matchChinese');
        var hintEl = document.getElementById('matchHint');

        // 设置总数
        matchTotalCount = matchWords.length;
        matchCorrectCount = 0;

        // 随机打乱中文顺序
        var shuffledChinese = shuffle(matchWords.map(function(w, i) {
            return { chinese: w.chinese, originalIndex: i };
        }));

        hintEl.textContent = '点击英文单词，再点击对应的中文意思进行连线（共 ' + matchWords.length + ' 组）';

        // 渲染英文单词（左侧）
        var wordsHtml = matchWords.map(function(w, i) {
            return '<div class="match-item match-word" data-index="' + i + '" data-word="' + w.word + '">' + w.word + '</div>';
        }).join('');
        wordsEl.innerHTML = wordsHtml;

        // 渲染中文意思（右侧，打乱顺序）
        var chineseHtml = shuffledChinese.map(function(item, i) {
            return '<div class="match-item match-chinese" data-index="' + i + '" data-original="' + item.originalIndex + '" data-chinese="' + item.chinese + '">' + item.chinese + '</div>';
        }).join('');
        chineseEl.innerHTML = chineseHtml;

        // 清空连线
        document.getElementById('matchLines').innerHTML = '';
        document.getElementById('matchFeedbackArea').innerHTML = '<div class="match-feedback hint">开始连线吧！</div>';

        // 添加点击事件
        wordsEl.querySelectorAll('.match-word').forEach(function(el) {
            el.addEventListener('click', onMatchWordClick);
        });
        chineseEl.querySelectorAll('.match-chinese').forEach(function(el) {
            el.addEventListener('click', onMatchChineseClick);
        });
    }

    function onMatchWordClick(e) {
        var index = parseInt(e.target.dataset.index);

        // 如果已经正确连线，不能点击
        if (e.target.classList.contains('correct-match')) {
            return;
        }

        // 如果已经错误连线（等待清除），不能点击
        if (e.target.classList.contains('wrong-match')) {
            return;
        }

        // 选中英文单词
        document.querySelectorAll('.match-word').forEach(function(el) {
            el.classList.remove('selected');
        });
        e.target.classList.add('selected');
        matchSelectedWord = index;

        // 如果已有选中的中文，自动连线
        if (matchSelectedChinese !== null) {
            createMatchConnection();
        }
    }

    function onMatchChineseClick(e) {
        var index = parseInt(e.target.dataset.index);

        // 如果已经正确连线，不能点击
        if (e.target.classList.contains('correct-match')) {
            return;
        }

        // 如果已经错误连线（等待清除），不能点击
        if (e.target.classList.contains('wrong-match')) {
            return;
        }

        // 选中中文
        document.querySelectorAll('.match-chinese').forEach(function(el) {
            el.classList.remove('selected');
        });
        e.target.classList.add('selected');
        matchSelectedChinese = index;

        // 如果已有选中的英文，自动连线
        if (matchSelectedWord !== null) {
            createMatchConnection();
        }
    }

    // 连线状态
    var matchCorrectCount = 0;  // 正确连线的数量
    var matchTotalCount = 0;    // 总连线数量
    var matchFeedbackEl = null; // 反馈提示元素

    function createMatchConnection() {
        if (matchSelectedWord === null || matchSelectedChinese === null) return;

        var wordEl = document.querySelector('.match-word[data-index="' + matchSelectedWord + '"]');
        var chineseEl = document.querySelector('.match-chinese[data-index="' + matchSelectedChinese + '"]');

        // 检查是否正确（中文的originalIndex应该等于单词的index）
        var isCorrect = parseInt(matchSelectedWord) === parseInt(chineseEl.dataset.original);

        // 清除选中状态
        document.querySelectorAll('.match-item').forEach(function(el) {
            el.classList.remove('selected');
        });

        if (isCorrect) {
            // 正确 - 建立连线，播放发音
            matchConnections[matchSelectedWord] = matchSelectedChinese;

            playSuccessSound();
            pronounce(matchWords[matchSelectedWord].word);

            // 标记正确状态（锁定，不可再改）
            wordEl.classList.add('connected', 'correct-match');
            chineseEl.classList.add('connected', 'correct-match');
            wordEl.style.pointerEvents = 'none';
            chineseEl.style.pointerEvents = 'none';

            matchCorrectCount++;
            sessionCorrect++;
            updateStats(true);

            // 显示正确提示
            showMatchFeedback('✅ ' + matchWords[matchSelectedWord].word + ' = ' + matchWords[matchSelectedWord].chinese, 'correct');

            // 绘制连线（只显示正确连线）
            drawMatchLines();

            // 检查是否全部完成
            if (matchCorrectCount >= matchTotalCount) {
                // 播放庆祝音效
                playCelebrationSound();
                setTimeout(function() {
                    showMatchFeedback('🎉 太棒了！全部连线正确！', 'complete');
                    // 1.5秒后继续学习
                    setTimeout(function() {
                        matchWords = [];
                        matchConnections = {};
                        matchCorrectCount = 0;
                        needMatchAfterTest = false;

                        document.getElementById('matchArea').classList.add('hidden');
                        document.getElementById('learnArea').classList.remove('hidden');

                        showNextWordToLearn();
                    }, 1500);
                }, 300);
            }
        } else {
            // 错误 - 红框震动提示，不连线
            playErrorSound();
            sessionWrong++;
            addWrongWord(currentDir, matchWords[matchSelectedWord]);
            updateStats(false);

            // 显示错误震动效果
            wordEl.classList.add('wrong-match');
            chineseEl.classList.add('wrong-match');

            // 显示错误提示
            showMatchFeedback('❌ 不对，再试试！', 'wrong');

            // 0.5秒后清除错误样式，用户可以继续尝试
            setTimeout(function() {
                wordEl.classList.remove('wrong-match');
                chineseEl.classList.remove('wrong-match');
                showMatchFeedback('继续连线吧！', 'hint');
            }, 500);
        }

        matchSelectedWord = null;
        matchSelectedChinese = null;
    }

    function showMatchFeedback(text, type) {
        var feedbackEl = document.getElementById('matchFeedbackArea');
        var className = 'match-feedback';
        if (type === 'correct') className += ' correct';
        else if (type === 'wrong') className += ' wrong';
        else if (type === 'complete') className += ' complete';

        feedbackEl.innerHTML = '<div class="' + className + '">' + text + '</div>';
    }

    function drawMatchLines() {
        var svg = document.getElementById('matchLines');
        var container = document.querySelector('.match-columns');
        var wordsEl = document.getElementById('matchWords');

        // 获取容器和单词栏的边界
        var containerRect = container.getBoundingClientRect();
        var wordsRect = wordsEl.getBoundingClientRect();

        // 设置SVG尺寸为容器大小
        svg.style.width = containerRect.width + 'px';
        svg.style.height = containerRect.height + 'px';

        var linesHtml = '';

        Object.keys(matchConnections).forEach(function(wordIndex) {
            var chineseIndex = matchConnections[wordIndex];

            var wordEl = document.querySelector('.match-word[data-index="' + wordIndex + '"]');
            var chineseItemEl = document.querySelector('.match-chinese[data-index="' + chineseIndex + '"]');

            if (!wordEl || !chineseItemEl) return;

            var wordItemRect = wordEl.getBoundingClientRect();
            var chineseItemRect = chineseItemEl.getBoundingClientRect();

            // 计算相对于容器的坐标
            // 起点：单词框的右边中心
            var startX = wordItemRect.right - containerRect.left;
            var startY = wordItemRect.top + wordItemRect.height / 2 - containerRect.top;

            // 终点：中文框的左边中心
            var endX = chineseItemRect.left - containerRect.left;
            var endY = chineseItemRect.top + chineseItemRect.height / 2 - containerRect.top;

            // 绘制贝塞尔曲线
            linesHtml += '<path class="match-line" d="M ' + startX + ' ' + startY +
                         ' C ' + (startX + 40) + ' ' + startY + ', ' + (endX - 40) + ' ' + endY + ', ' + endX + ' ' + endY + '" />';
        });

        svg.innerHTML = linesHtml;
    }

    // 选择题答案处理
    function onOptionClick(e) {
        // 如果正在处理中，忽略点击
        if (isTestInProgress) {
            console.log('=== 测试正在进行，忽略点击 ===');
            return;
        }

        var target = e.target;
        var option = target.closest('.test-option');
        if (!option) return;

        var answer = option.dataset.answer;
        if (!answer) return;

        // 先清除所有选项的选中状态（防止移动端hover残留）
        document.querySelectorAll('.test-option').forEach(function(opt) {
            opt.classList.remove('selected', 'hover-active');
            // 强制清除hover样式
            opt.style.backgroundColor = '';
            opt.style.borderColor = '';
            opt.style.color = '';
            opt.style.transform = '';
            opt.style.boxShadow = '';
        });

        var isCorrect;
        if (currentTestType === TEST_TYPES.CHOOSE_CHINESE) {
            isCorrect = answer === currentWord.chinese;
        } else {
            isCorrect = answer === currentWord.word;
        }

        if (isCorrect) {
            option.classList.add('correct');
        }

        showTestFeedback(isCorrect, isCorrect ? null : option);
    }

    // ===== 完成页面 =====
    function showComplete() {
        if (isReviewMode) {
            // 复习错词完成
            // 检查消灭错词积分：每20个消灭的错词得3积分
            if (wrongWordsClearedThisRound >= 20) {
                var pointsToAdd = Math.floor(wrongWordsClearedThisRound / 20) * 3;
                addClearedWrongCount(wrongWordsClearedThisRound);
                if (pointsToAdd > 0) {
                    addPoints(pointsToAdd, '消灭了 ' + wrongWordsClearedThisRound + ' 个错词！');
                }
            } else if (wrongWordsClearedThisRound > 0) {
                addClearedWrongCount(wrongWordsClearedThisRound);
            }

            if (isReviewAllWrongMode) {
                alert('总错题库复习完成！消灭了 ' + wrongWordsClearedThisRound + ' 个错词！');
                showAllWrong();
            } else {
                alert('复习完成！消灭了 ' + wrongWordsClearedThisRound + ' 个错词！');
                selectDir(currentDir);
            }
            return;
        }

        // 正常学习完成
        // 检查学习积分：每30个单词得5积分
        var newLearnedCount = addLearnedWordsCount(sessionLearned);
        var pointsToAdd = Math.floor(newLearnedCount / 30) * 5 - Math.floor((newLearnedCount - sessionLearned) / 30) * 5;
        if (pointsToAdd > 0) {
            addPoints(pointsToAdd, '学习了 ' + (Math.floor(newLearnedCount / 30) * 30) + ' 个单词！');
        }

        // 记录今日学习数量（用于显示）
        var todayLearned = addTodayLearned(sessionLearned);

        showPage('complete');
        document.getElementById('dirTotal').textContent = sessionLearned;
        var totalTests = sessionCorrect + sessionWrong;
        var rate = totalTests > 0 ? Math.round((sessionCorrect / totalTests) * 100) : 100;
        document.getElementById('dirCorrectRate').textContent = rate;

        // 检查是否达到每日目标
        if (todayLearned >= dailyGoal) {
            showDailyGoalCelebration();
        }
    }

    // 每日目标达成庆祝
    function showDailyGoalCelebration() {
        // 播放庆祝音效和掌声
        playCelebrationSound();
        setTimeout(playApplauseSound, 600);

        // 更新庆祝弹窗中的数量
        var countEl = document.getElementById('celebrationCount');
        if (countEl) {
            countEl.textContent = getTodayLearned();
        }

        // 显示庆祝弹窗
        var modal = document.getElementById('celebrationModal');
        if (modal) {
            modal.classList.remove('hidden');
            // 显示鲜花和动画
            startCelebrationAnimation();
        }
    }

    // 庆祝动画
    function startCelebrationAnimation() {
        var container = document.querySelector('.celebration-flowers');
        if (!container) return;

        var flowers = ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🎉', '⭐', '✨', '🌟'];
        container.innerHTML = '';

        for (var i = 0; i < 30; i++) {
            var flower = document.createElement('span');
            flower.textContent = flowers[Math.floor(Math.random() * flowers.length)];
            flower.className = 'celebration-flower';
            flower.style.left = Math.random() * 100 + '%';
            flower.style.animationDelay = Math.random() * 2 + 's';
            flower.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
            container.appendChild(flower);
        }
    }

    // 关闭庆祝弹窗
    function closeCelebrationModal() {
        var modal = document.getElementById('celebrationModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        var container = document.querySelector('.celebration-flowers');
        if (container) {
            container.innerHTML = '';
        }
    }

    // ===== 统计 =====
    function showStats() {
        showPage('stats');

        var stats = load(KEYS.STATS) || { total: 0, correct: 0 };
        var wrong = load(KEYS.WRONG_WORDS) || {};

        document.getElementById('totalLearned').textContent = stats.total;
        document.getElementById('totalCorrect').textContent = stats.total > 0
            ? Math.round((stats.correct / stats.total) * 100) + '%' : '100%';

        var totalWrong = Object.keys(wrong).reduce(function(sum, dir) {
            return sum + (wrong[dir] || []).length;
        }, 0);
        document.getElementById('totalWrong').textContent = totalWrong;

        var html = '';
        Object.keys(wrong).forEach(function(dir) {
            var count = wrong[dir].length;
            if (count > 0) {
                html += '<div class="dir-wrong-item" data-dir="' + dir + '">';
                html += '<span class="dir-wrong-name">' + dir + '</span>';
                html += '<span class="dir-wrong-count">' + count + '错</span>';
                html += '</div>';
            }
        });

        document.getElementById('dirWrongList').innerHTML = html || '<p style="color:#888;text-align:center;">太棒了！没有错词！</p>';

        document.getElementById('dirWrongList').querySelectorAll('.dir-wrong-item').forEach(function(item) {
            item.addEventListener('click', function() {
                showDirWrongWords(item.dataset.dir);
            });
        });
    }

    function showDirWrongWords(dir) {
        showPage('dir-wrong');
        document.getElementById('dirWrongTitle').textContent = dir + ' - 错词本（按难度排序）';

        var wrongWords = getWrongWords(dir);
        // 按难度排序
        wrongWords = sortWrongWordsByDifficulty(wrongWords);

        var html = wrongWords.map(function(w, idx) {
            var wrongCount = w.wrongCount || 0;
            var correctCount = w.correctCount || 0;
            var difficultyLabel = wrongCount >= 3 ? '🔥难题' : (wrongCount >= 1 ? '⚠️难点' : '');
            return '<div class="wrong-word-item">' +
                '<span class="wrong-word-rank">' + (idx + 1) + '</span>' +
                '<span class="wrong-word-text">' + w.word + '</span>' +
                '<span class="wrong-word-chinese">' + w.chinese + '</span>' +
                '<span class="wrong-word-stats">' + difficultyLabel + ' 错' + wrongCount + '/对' + correctCount + '</span>' +
                '</div>';
        }).join('');

        document.getElementById('dirWrongWordsList').innerHTML = html || '<p style="color:#888;">没有错词</p>';

        document.getElementById('reviewDirWrongBtn').onclick = function() {
            currentDir = dir;
            startReviewWrong();
        };
    }

    // ===== 总错题库 =====
    function showAllWrong() {
        showPage('all-wrong');

        // 更新错词统计
        document.getElementById('allWrongCount').textContent = getAllWrongCount();
        document.getElementById('todayClearedCount').textContent = getClearedWrongCount();

        // 显示各目录错词列表
        var wrong = load(KEYS.WRONG_WORDS) || {};
        var html = '';

        Object.keys(wrong).forEach(function(dir) {
            var count = (wrong[dir] || []).length;
            if (count > 0) {
                html += '<div class="all-wrong-dir-item" data-dir="' + dir + '">';
                html += '<span class="all-wrong-dir-name">' + dir + '</span>';
                html += '<span class="all-wrong-dir-count">' + count + '错</span>';
                html += '</div>';
            }
        });

        document.getElementById('allWrongList').innerHTML = html || '<p style="color:#888;text-align:center;padding:20px;">太棒了！没有错词！</p>';

        // 绑定点击事件（点击某个目录可以查看详情）
        document.getElementById('allWrongList').querySelectorAll('.all-wrong-dir-item').forEach(function(item) {
            item.addEventListener('click', function() {
                currentDir = item.dataset.dir;
                startReviewWrongFromAll();
            });
        });

        // 检查是否有错词，更新按钮状态
        var reviewBtn = document.getElementById('reviewAllWrongBtn');
        if (getAllWrongCount() === 0) {
            reviewBtn.disabled = true;
            reviewBtn.textContent = '没有错词';
            reviewBtn.style.opacity = '0.5';
        } else {
            reviewBtn.disabled = false;
            reviewBtn.textContent = '开始复习所有错词';
            reviewBtn.style.opacity = '1';
        }
    }

    // 从总错题库复习所有错词
    function startReviewAllWrong() {
        var allWrongWords = getAllWrongWords();
        if (allWrongWords.length === 0) {
            alert('太棒了！没有错词！');
            return;
        }

        isReviewMode = true;
        isReviewAllWrongMode = true;  // 标记为总错题库复习模式
        reviewWrongDirs = [];  // 记录正在复习的目录

        // 收集所有有错词的目录
        var wrong = load(KEYS.WRONG_WORDS) || {};
        Object.keys(wrong).forEach(function(dir) {
            if ((wrong[dir] || []).length > 0) {
                reviewWrongDirs.push(dir);
            }
        });

        // 重置错词正确计数
        wrongWordCorrectCount = {};

        // 按难度排序后设置复习单词列表
        currentWords = sortWrongWordsByDifficulty(allWrongWords).slice();
        allWordsOriginal = currentWords.slice();  // 用于生成选项
        learnedWords = [];
        currentIndex = 0;
        currentTestIndex = 0;
        testWordsQueue = [];
        sessionLearned = 0;
        sessionCorrect = 0;
        sessionWrong = 0;
        sessionLearnCount = 0;
        needMatchAfterTest = false;
        wrongWordsClearedThisRound = 0;

        document.getElementById('learnArea').classList.remove('hidden');
        document.getElementById('testArea').classList.add('hidden');
        document.getElementById('matchArea').classList.add('hidden');
        document.getElementById('reviewHint').classList.add('hidden');

        showPage('learn');
        showNextWordToLearn();
    }

    // 从总错题库复习某个目录的错词
    function startReviewWrongFromAll() {
        var wrongWords = getWrongWords(currentDir);
        if (wrongWords.length === 0) {
            alert('太棒了！没有错词！');
            return;
        }

        isReviewMode = true;
        isReviewAllWrongMode = true;  // 标记为总错题库复习模式
        reviewWrongDirs = [currentDir];

        // 重置错词正确计数
        wrongWordCorrectCount = {};

        // 添加错词的详细信息并按难度排序
        var wrongData = load(KEYS.WRONG_WORDS) || {};
        var dirWrongData = wrongData[currentDir] || [];

        var sortedWrongData = sortWrongWordsByDifficulty(dirWrongData);
        currentWords = sortedWrongData.map(function(w) {
            return {
                word: w.word,
                chinese: w.chinese,
                dir: currentDir,
                wrongTime: w.wrongTime,
                wrongCount: w.wrongCount || 0,
                correctCount: w.correctCount || 0
            };
        });
        allWordsOriginal = currentWords.slice();
        learnedWords = [];
        currentIndex = 0;
        currentTestIndex = 0;
        testWordsQueue = [];
        sessionLearned = 0;
        sessionCorrect = 0;
        sessionWrong = 0;
        sessionLearnCount = 0;
        needMatchAfterTest = false;
        wrongWordsClearedThisRound = 0;

        document.getElementById('learnArea').classList.remove('hidden');
        document.getElementById('testArea').classList.add('hidden');
        document.getElementById('matchArea').classList.add('hidden');
        document.getElementById('reviewHint').classList.add('hidden');

        showPage('learn');
        showNextWordToLearn();
    }

    // ===== 初始化 =====
    function init() {
        // 初始化语音引擎
        initSpeech();

        renderDirs();

        // 更新积分显示
        updatePointsDisplay();

        // 发音按钮
        document.getElementById('pronounceBtn').addEventListener('click', function() {
            if (currentWord) pronounce(currentWord.word);
        });
        document.getElementById('testPronounceBtn').addEventListener('click', function() {
            if (currentWord) pronounce(currentWord.word);
        });

        // 学习按钮
        document.getElementById('rememberedBtn').addEventListener('click', onRemembered);
        document.getElementById('notSureBtn').addEventListener('click', onNotSure);

        // 左滑返回上一单词
        setupSwipeGesture();

        // 测试选项点击
        document.getElementById('testOptions').addEventListener('click', onOptionClick);

        // 返回按钮
        document.getElementById('backToHomeBtn').addEventListener('click', function() { showPage('home'); });
        document.getElementById('backFromStatsBtn').addEventListener('click', function() { showPage('home'); });
        document.getElementById('backFromDirWrongBtn').addEventListener('click', showStats);
        document.getElementById('backFromAllWrongBtn').addEventListener('click', function() { showPage('home'); });

        // 复习错词
        document.getElementById('reviewWrongBtn').addEventListener('click', startReviewWrong);

        // 统计
        document.getElementById('viewAllStatsBtn').addEventListener('click', showStats);

        // 总错题库
        document.getElementById('viewAllWrongBtn').addEventListener('click', showAllWrong);
        document.getElementById('reviewAllWrongBtn').addEventListener('click', startReviewAllWrong);

        // 休息弹窗
        document.getElementById('continueAfterRestBtn').addEventListener('click', function() {
            hideModal('restModal');
            showNextTest();
        });

        // 完成页面
        document.getElementById('continueNextBtn').addEventListener('click', function() {
            var dirs = Object.keys(PET_WORDS.level2_dirs);
            var currentIdx = dirs.indexOf(currentDir);
            if (currentIdx < dirs.length - 1) {
                selectDir(dirs[currentIdx + 1]);
            } else {
                showPage('home');
            }
        });
        document.getElementById('backHomeFromCompleteBtn').addEventListener('click', function() { showPage('home'); });

        // 每日目标庆祝弹窗
        document.getElementById('closeCelebrationBtn').addEventListener('click', closeCelebrationModal);

        // 积分奖励弹窗
        document.getElementById('closePointsBtn').addEventListener('click', function() {
            hideModal('pointsModal');
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();