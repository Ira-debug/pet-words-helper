// images.js - 图片搜索

const Images = {
    // 图片缓存
    cache: {},
    loading: false,

    // 使用Unsplash搜索图片（免费，无需API key）
    unsplashUrl: 'https://source.unsplash.com/featured/?',

    // 备用方案：使用简单的emoji图片
    emojiMap: {
        'apple': '🍎',
        'banana': '🍌',
        'cat': '🐱',
        'dog': '🐶',
        'egg': '🥚',
        'fish': '🐟',
        'girl': '👧',
        'boy': '👦',
        'happy': '😊',
        'jump': '🦘',
        'king': '👑',
        'lion': '🦁',
        'milk': '🥛',
        'nose': '👃',
        'orange': '🍊',
        'pig': '🐷',
        'queen': '👸',
        'rabbit': '🐰',
        'sun': '☀️',
        'tree': '🌳',
        'water': '💧',
        'book': '📚',
        'car': '🚗',
        'bird': '🐦',
        'house': '🏠',
        'flower': '🌸',
        'star': '⭐',
        'moon': '🌙',
        'cloud': '☁️',
        'rain': '🌧️',
        'snow': '❄️',
        'heart': '❤️',
        'love': '💕',
        'smile': '😀',
        'cry': '😢',
        'sleep': '😴',
        'eat': '🍽️',
        'drink': '🥤',
        'run': '🏃',
        'walk': '🚶',
        'fly': '🦋',
        'swim': '🏊',
        'dance': '💃',
        'sing': '🎤',
        'play': '🎮',
        'study': '📖',
        'work': '💼',
        'school': '🏫',
        'home': '🏡',
        'family': '👨‍👩‍👧‍👦',
        'friend': '🤝',
        'teacher': '👨‍🏫',
        'doctor': '👨‍⚕️',
        'food': '🍕',
        'fruit': '🍇',
        'vegetable': '🥕',
        'animal': '🦁',
        'plant': '🌿',
        'color': '🎨',
        'music': '🎵',
        'movie': '🎬',
        'sport': '⚽',
        'game': '🎯',
        'travel': '🧳',
        'money': '💰',
        'time': '⏰',
        'day': '📅',
        'night': '🌃',
        'morning': '🌅',
        'evening': '🌆'
    },

    // 获取图片URL
    getImageUrl(word) {
        const lowerWord = word.toLowerCase();

        // 检查缓存
        if (this.cache[lowerWord]) {
            return this.cache[lowerWord];
        }

        // 使用Unsplash搜索
        const url = `${this.unsplashUrl}${encodeURIComponent(lowerWord)}&w=400&h=300`;

        // 缓存结果
        this.cache[lowerWord] = url;

        return url;
    },

    // 获取emoji（备用）
    getEmoji(word) {
        const lowerWord = word.toLowerCase();
        return this.emojiMap[lowerWord] || '🌟';
    },

    // 加载图片到元素
    loadImageToElement(word, imgElement) {
        const url = this.getImageUrl(word);
        const emoji = this.getEmoji(word);

        // 设置加载状态
        imgElement.style.opacity = '0.5';
        imgElement.src = '';

        // 创建备用方案
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'image-fallback';
        fallbackDiv.innerHTML = `
            <div class="emoji-display">${emoji}</div>
            <div class="word-hint">${word}</div>
        `;

        // 尝试加载图片
        const testImg = new Image();
        testImg.crossOrigin = 'anonymous';

        testImg.onload = () => {
            imgElement.src = url;
            imgElement.style.opacity = '1';
        };

        testImg.onerror = () => {
            // 图片加载失败，显示emoji
            const parent = imgElement.parentElement;
            if (parent) {
                parent.innerHTML = '';
                parent.appendChild(fallbackDiv);
                parent.style.background = '#f3e5f5';
                parent.style.display = 'flex';
                parent.style.alignItems = 'center';
                parent.style.justifyContent = 'center';
            }
        };

        testImg.src = url;

        // 设置超时
        setTimeout(() => {
            if (!imgElement.src || imgElement.style.opacity === '0.5') {
                testImg.onerror();
            }
        }, 5000);
    },

    // 预加载图片
    preloadImages(words) {
        words.forEach(word => {
            const url = this.getImageUrl(word.word);
            // 预加载但不等待
            const img = new Image();
            img.src = url;
        });
    },

    // 清除缓存
    clearCache() {
        this.cache = {};
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Images;
}