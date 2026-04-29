// vocabulary.js - 单词库处理

const Vocabulary = {
    // 当前单词库
    words: [],
    currentIndex: 0,

    // 示例单词库
    sampleWords: [
        { word: 'apple', phonetic: '/ˈæpl/', chinese: '苹果', sentence: 'I like to eat apples! They are yummy!' },
        { word: 'banana', phonetic: '/bəˈnɑːnə/', chinese: '香蕉', sentence: 'Bananas are yellow and sweet!' },
        { word: 'cat', phonetic: '/kæt/', chinese: '猫咪', sentence: 'The cat is sleeping on the bed.' },
        { word: 'dog', phonetic: '/dɒɡ/', chinese: '小狗', sentence: 'My dog likes to play in the park!' },
        { word: 'egg', phonetic: '/eɡ/', chinese: '鸡蛋', sentence: 'I eat eggs for breakfast every day.' },
        { word: 'fish', phonetic: '/fɪʃ/', chinese: '鱼', sentence: 'The fish swims in the water.' },
        { word: 'girl', phonetic: '/ɡɜːl/', chinese: '女孩', sentence: 'The girl is reading a book.' },
        { word: 'boy', phonetic: '/bɔɪ/', chinese: '男孩', sentence: 'The boy is playing football.' },
        { word: 'happy', phonetic: '/ˈhæpi/', chinese: '开心的', sentence: 'I am so happy today!' },
        { word: 'jump', phonetic: '/dʒʌmp/', chinese: '跳跃', sentence: 'The rabbit can jump very high!' },
        { word: 'king', phonetic: '/kɪŋ/', chinese: '国王', sentence: 'The king lives in a big castle.' },
        { word: 'lion', phonetic: '/ˈlaɪən/', chinese: '狮子', sentence: 'The lion is the king of the jungle.' },
        { word: 'milk', phonetic: '/mɪlk/', chinese: '牛奶', sentence: 'I drink milk every morning.' },
        { word: 'nose', phonetic: '/nəʊz/', chinese: '鼻子', sentence: 'My nose helps me smell flowers.' },
        { word: 'orange', phonetic: '/ˈɒrɪndʒ/', chinese: '橙子', sentence: 'Oranges are full of vitamin C!' },
        { word: 'pig', phonetic: '/pɪɡ/', chinese: '猪', sentence: 'The pig lives on the farm.' },
        { word: 'queen', phonetic: '/kwiːn/', chinese: '女王', sentence: 'The queen is very kind.' },
        { word: 'rabbit', phonetic: '/ˈræbɪt/', chinese: '兔子', sentence: 'Rabbits like to eat carrots.' },
        { word: 'sun', phonetic: '/sʌn/', chinese: '太阳', sentence: 'The sun is shining brightly.' },
        { word: 'tree', phonetic: '/triː/', chinese: '树', sentence: 'Birds sing on the tree.' }
    ],

    // 从文件导入单词
    async importFromFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();

        try {
            if (extension === 'csv') {
                return await this.parseCSV(file);
            } else if (extension === 'xlsx' || extension === 'xls') {
                return await this.parseExcel(file);
            } else {
                throw new Error('不支持的文件格式');
            }
        } catch (e) {
            console.error('导入失败:', e);
            throw e;
        }
    },

    // 解析CSV文件
    async parseCSV(file) {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        // 判断是否有表头
        const firstLine = lines[0];
        const hasHeader = this.detectHeader(firstLine);

        const startIndex = hasHeader ? 1 : 0;
        const words = [];

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const word = this.parseLine(line);
            if (word) {
                words.push(word);
            }
        }

        return words;
    },

    // 解析Excel文件
    async parseExcel(file) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // 判断是否有表头
        const hasHeader = this.detectHeaderFromArray(jsonData[0]);

        const startIndex = hasHeader ? 1 : 0;
        const words = [];

        for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[0]) continue;

            const word = this.parseRow(row);
            if (word) {
                words.push(word);
            }
        }

        return words;
    },

    // 检测是否有表头
    detectHeader(line) {
        const lowerLine = line.toLowerCase();
        const headers = ['word', '单词', 'english', '词汇', 'phonetic', '音标', 'chinese', '中文', 'translation', '翻译', 'sentence', '例句'];
        return headers.some(h => lowerLine.includes(h));
    },

    detectHeaderFromArray(row) {
        if (!row || row.length === 0) return false;
        const firstCell = String(row[0]).toLowerCase();
        const headers = ['word', '单词', 'english', '词汇'];
        return headers.some(h => firstCell.includes(h));
    },

    // 解析单行CSV
    parseLine(line) {
        // 支持逗号分隔
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));

        if (parts.length === 1) {
            // 只有单词
            return { word: parts[0], phonetic: '', chinese: '', sentence: '' };
        } else if (parts.length >= 2) {
            return {
                word: parts[0],
                phonetic: parts[1] || '',
                chinese: parts[2] || '',
                sentence: parts[3] || ''
            };
        }

        return null;
    },

    // 解析Excel行
    parseRow(row) {
        if (!row || !row[0]) return null;

        return {
            word: String(row[0]).trim(),
            phonetic: row[1] ? String(row[1]).trim() : '',
            chinese: row[2] ? String(row[2]).trim() : '',
            sentence: row[3] ? String(row[3]).trim() : ''
        };
    },

    // 加载单词库
    loadWords() {
        // 从localStorage加载
        const savedWords = Storage.loadVocabulary();
        if (savedWords && savedWords.length > 0) {
            this.words = savedWords;
        }
        this.currentIndex = Storage.loadCurrentIndex();
        return this.words;
    },

    // 保存单词库
    saveWords(words) {
        this.words = words;
        Storage.saveVocabulary(words);
    },

    // 使用示例单词库
    useSampleWords() {
        this.words = this.sampleWords;
        Storage.saveVocabulary(this.sampleWords);
        return this.sampleWords;
    },

    // 获取当前单词
    getCurrentWord() {
        if (this.currentIndex >= this.words.length) {
            return null;
        }
        return this.words[this.currentIndex];
    },

    // 下一个单词
    nextWord() {
        this.currentIndex++;
        Storage.saveCurrentIndex(this.currentIndex);
        return this.getCurrentWord();
    },

    // 重置进度
    reset() {
        this.currentIndex = 0;
        Storage.saveCurrentIndex(0);
        Storage.clearLearnedWords();
    },

    // 获取剩余单词数
    getRemainingCount() {
        return this.words.length - this.currentIndex;
    },

    // 获取随机选项（用于测试）
    getRandomOptions(currentWord, count = 4) {
        const options = [currentWord.chinese];

        // 从其他单词中随机选择
        const otherWords = this.words.filter(w => w.word !== currentWord.word);
        const shuffled = otherWords.sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count - 1, shuffled.length); i++) {
            options.push(shuffled[i].chinese);
        }

        // 如果单词不够，添加一些随机中文
        if (options.length < count) {
            const randomOptions = ['红色', '蓝色', '开心', '跑步', '学习', '朋友', '学校', '家人'];
            while (options.length < count) {
                const random = randomOptions[Math.floor(Math.random() * randomOptions.length)];
                if (!options.includes(random)) {
                    options.push(random);
                }
            }
        }

        // 打乱顺序
        return options.sort(() => Math.random() - 0.5);
    },

    // 获取错词优先学习列表
    getWordsWithReview() {
        const wrongWords = Storage.loadWrongWords();
        const remainingWords = this.words.slice(this.currentIndex);

        // 错词排在前面
        const reviewWords = wrongWords.filter(w =>
            remainingWords.some(r => r.word === w.word)
        );

        const newWords = remainingWords.filter(w =>
            !wrongWords.some(r => r.word === w.word)
        );

        return [...reviewWords, ...newWords];
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Vocabulary;
}