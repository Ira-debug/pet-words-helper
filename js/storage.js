// storage.js - 本地存储管理

const Storage = {
    // 存储键名
    KEYS: {
        VOCABULARY: 'vocabulary_data',
        WRONG_WORDS: 'wrong_words',
        TODAY_COUNT: 'today_count',
        TOTAL_WORDS: 'total_words',
        CORRECT_COUNT: 'correct_count',
        LEARN_DAYS: 'learn_days',
        LAST_DATE: 'last_date',
        CURRENT_INDEX: 'current_index',
        LEARNED_WORDS: 'learned_words'
    },

    // 保存数据
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存失败:', e);
            return false;
        }
    },

    // 读取数据
    load: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('读取失败:', e);
            return null;
        }
    },

    // 删除数据
    remove: function(key) {
        localStorage.removeItem(key);
    },

    // 清空所有数据
    clearAll: function() {
        Object.values(this.KEYS).forEach(function(key) {
            localStorage.removeItem(key);
        });
    },

    // 单词库管理
    saveVocabulary: function(words) {
        return this.save(this.KEYS.VOCABULARY, words);
    },

    loadVocabulary: function() {
        return this.load(this.KEYS.VOCABULARY) || [];
    },

    // 错词本管理
    addWrongWord: function(word) {
        const wrongWords = this.load(this.KEYS.WRONG_WORDS) || [];
        // 避免重复添加
        if (!wrongWords.find(function(w) { return w.word === word.word; })) {
            wrongWords.push({
                word: word.word,
                phonetic: word.phonetic,
                chinese: word.chinese,
                sentence: word.sentence,
                wrongCount: 1,
                lastWrongTime: Date.now()
            });
        } else {
            // 增加错误次数
            const existing = wrongWords.find(function(w) { return w.word === word.word; });
            existing.wrongCount++;
            existing.lastWrongTime = Date.now();
        }
        this.save(this.KEYS.WRONG_WORDS, wrongWords);
        return wrongWords;
    },

    removeWrongWord: function(word) {
        const wrongWords = this.load(this.KEYS.WRONG_WORDS) || [];
        const filtered = wrongWords.filter(function(w) { return w.word !== word.word; });
        this.save(this.KEYS.WRONG_WORDS, filtered);
        return filtered;
    },

    loadWrongWords: function() {
        return this.load(this.KEYS.WRONG_WORDS) || [];
    },

    // 进度统计
    updateTodayCount: function(count) {
        this.save(this.KEYS.TODAY_COUNT, count);

        // 更新累计单词数
        const total = this.load(this.KEYS.TOTAL_WORDS) || 0;
        this.save(this.KEYS.TOTAL_WORDS, total + 1);

        // 更新日期和天数
        const today = new Date().toDateString();
        const lastDate = this.load(this.KEYS.LAST_DATE);

        if (lastDate !== today) {
            const days = this.load(this.KEYS.LEARN_DAYS) || 0;
            this.save(this.KEYS.LEARN_DAYS, days + 1);
            this.save(this.KEYS.LAST_DATE, today);
        }
    },

    getTodayCount: function() {
        return this.load(this.KEYS.TODAY_COUNT) || 0;
    },

    resetTodayCount: function() {
        this.save(this.KEYS.TODAY_COUNT, 0);
    },

    getStats: function() {
        return {
            totalWords: this.load(this.KEYS.TOTAL_WORDS) || 0,
            correctCount: this.load(this.KEYS.CORRECT_COUNT) || 0,
            learnDays: this.load(this.KEYS.LEARN_DAYS) || 0,
            wrongWordsCount: this.loadWrongWords().length
        };
    },

    updateCorrectCount: function() {
        const count = this.load(this.KEYS.CORRECT_COUNT) || 0;
        this.save(this.KEYS.CORRECT_COUNT, count + 1);
    },

    // 学习进度
    saveCurrentIndex: function(index) {
        this.save(this.KEYS.CURRENT_INDEX, index);
    },

    loadCurrentIndex: function() {
        return this.load(this.KEYS.CURRENT_INDEX) || 0;
    },

    addLearnedWord: function(word) {
        const learned = this.load(this.KEYS.LEARNED_WORDS) || [];
        if (!learned.includes(word.word)) {
            learned.push(word.word);
            this.save(this.KEYS.LEARNED_WORDS, learned);
        }
    },

    loadLearnedWords: function() {
        return this.load(this.KEYS.LEARNED_WORDS) || [];
    },

    clearLearnedWords: function() {
        this.save(this.KEYS.LEARNED_WORDS, []);
        this.save(this.KEYS.CURRENT_INDEX, 0);
    }
};

// 导出（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}