// quiz.js - 测试逻辑

const Quiz = {
    // 当前测试单词
    currentWord: null,
    // 选项
    options: [],
    // 正确答案
    correctAnswer: null,
    // 是否正在测试
    isTesting: false,

    // 鼓励语列表
    correctMessages: [
        '太棒了！你真聪明！🎉',
        '好厉害！继续加油！⭐',
        '答对了！你是最棒的！🌟',
        '真了不起！给你点赞！👍',
        '完美！你学得真好！✨'
    ],

    // 错误鼓励语列表
    wrongMessages: [
        '没关系，再想想哦！💪',
        '别担心，我们一起学习！📚',
        '加油！下一次一定能记住！🌈',
        '不着急，慢慢来！🌻',
        '没关系，错误是学习的好机会！💡'
    ],

    // 开始测试
    startTest(word, allWords) {
        this.currentWord = word;
        this.correctAnswer = word.chinese;
        this.options = Vocabulary.getRandomOptions(word, 4);
        this.isTesting = true;

        return {
            word: word.word,
            phonetic: word.phonetic,
            options: this.options
        };
    },

    // 检查答案
    checkAnswer(selectedAnswer) {
        const isCorrect = selectedAnswer === this.correctAnswer;

        if (isCorrect) {
            // 正确处理
            Storage.updateCorrectCount();
            Storage.removeWrongWord(this.currentWord);

            return {
                correct: true,
                message: this.getRandomCorrectMessage(),
                word: this.currentWord
            };
        } else {
            // 错误处理
            Storage.addWrongWord(this.currentWord);

            return {
                correct: false,
                message: this.getRandomWrongMessage(),
                correctAnswer: this.correctAnswer,
                explanation: this.generateExplanation(this.currentWord)
            };
        }
    },

    // 获取随机鼓励语
    getRandomCorrectMessage() {
        return this.correctMessages[Math.floor(Math.random() * this.correctMessages.length)];
    },

    getRandomWrongMessage() {
        return this.wrongMessages[Math.floor(Math.random() * this.wrongMessages.length)];
    },

    // 生成解释
    generateExplanation(word) {
        if (word.sentence) {
            return `${word.word} 意思是"${word.chinese}"。比如：${word.sentence}`;
        } else {
            return `${word.word} 意思是"${word.chinese}"。记住它哦！`;
        }
    },

    // 结束测试
    endTest() {
        this.isTesting = false;
        this.currentWord = null;
        this.options = [];
    },

    // 生成输入型测试（可选）
    generateInputTest(word) {
        return {
            word: word.word,
            phonetic: word.phonetic,
            hint: word.chinese.charAt(0) + '...',  // 提示第一个字
            answer: word.chinese
        };
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Quiz;
}