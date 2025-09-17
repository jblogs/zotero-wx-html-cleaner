/**
 * HTML清理工具 - 移除CSS和字体设置，保留文字和图片内容
 * 专门针对SingleFile保存的微信公众号文章
 * 版本: 2.0.1 - 完全复刻命令行版本的逻辑
 */
class HTMLCleaner {
    constructor() {
        this.preservedTags = new Set([
            'html', 'head', 'body', 'title', 'meta',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'div', 'span', 'a', 'img', 'br',
            'strong', 'b', 'em', 'i', 'u',
            'ul', 'ol', 'li', 'blockquote',
            'table', 'tr', 'td', 'th', 'thead', 'tbody'
        ]);
        
        this.preservedAttributes = new Set([
            'charset', 'content', 'name', 'property',
            'href', 'src', 'alt', 'title', 'id'
        ]);
    }

    /**
     * 清理HTML内容 - 主入口方法
     * @param {string} htmlContent - HTML内容字符串
     * @returns {string} 清理后的HTML内容
     */
    async cleanHTMLContent(htmlContent) {
        try {
            this.log('开始清理HTML内容...');
            
            // 在Zotero环境中使用DOMParser而不是JSDOM
            const parser = new DOMParser();
            const document = parser.parseFromString(htmlContent, 'text/html');
            
            // 执行清理操作
            this.removeStyleElements(document);
            this.removeInlineStyles(document);
            this.removeFontRelatedAttributes(document);
            this.removeClassAttributes(document);
            this.removeUnnecessaryAttributes(document);
            this.simplifyMetaTags(document);
            this.preserveEssentialContent(document);
            
            // 生成清理后的HTML
            const cleanedHTML = this.generateCleanHTML(document);
            
            this.log(`原文件大小: ${(htmlContent.length / 1024).toFixed(2)} KB`);
            this.log(`清理后大小: ${(cleanedHTML.length / 1024).toFixed(2)} KB`);
            
            return cleanedHTML;
        } catch (error) {
            this.error('处理HTML内容时出错:', error);
            return htmlContent; // 出错时返回原内容
        }
    }

    /**
     * 移除所有style标签
     */
    removeStyleElements(document) {
        const styleElements = document.querySelectorAll('style');
        styleElements.forEach(element => element.remove());
        this.log(`移除了 ${styleElements.length} 个 <style> 标签`);
    }

    /**
     * 移除所有内联样式
     */
    removeInlineStyles(document) {
        const elementsWithStyle = document.querySelectorAll('[style]');
        let count = 0;
        elementsWithStyle.forEach(element => {
            element.removeAttribute('style');
            count++;
        });
        this.log(`移除了 ${count} 个内联样式属性`);
    }

    /**
     * 移除字体相关属性
     */
    removeFontRelatedAttributes(document) {
        const fontAttributes = ['font-family', 'font-size', 'font-weight', 'color'];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            fontAttributes.forEach(attr => {
                if (element.hasAttribute && element.hasAttribute(attr)) {
                    element.removeAttribute(attr);
                }
            });
        });
    }

    /**
     * 移除class属性
     */
    removeClassAttributes(document) {
        const elementsWithClass = document.querySelectorAll('[class]');
        let count = 0;
        elementsWithClass.forEach(element => {
            element.removeAttribute('class');
            count++;
        });
        this.log(`移除了 ${count} 个 class 属性`);
    }

    /**
     * 移除不必要的属性
     */
    removeUnnecessaryAttributes(document) {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            const attributes = Array.from(element.attributes || []);
            attributes.forEach(attr => {
                if (!this.preservedAttributes.has(attr.name) && 
                    !attr.name.startsWith('data-') && 
                    attr.name !== 'role' && 
                    attr.name !== 'tabindex') {
                    element.removeAttribute(attr.name);
                }
            });
        });
    }

    /**
     * 简化meta标签，只保留必要的编码和描述信息
     */
    simplifyMetaTags(document) {
        const metaTags = document.querySelectorAll('meta');
        const essentialMetas = new Set(['charset', 'description', 'author']);
        
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name');
            const property = meta.getAttribute('property');
            const httpEquiv = meta.getAttribute('http-equiv');
            
            // 保留charset meta标签
            if (meta.hasAttribute('charset')) {
                return;
            }
            
            // 保留基本的meta信息
            if (name && essentialMetas.has(name)) {
                return;
            }
            
            // 移除其他meta标签
            meta.remove();
        });
    }

    /**
     * 保留核心内容元素
     */
    preserveEssentialContent(document) {
        // 确保保留文章标题
        const title = document.querySelector('h1');
        if (title) {
            title.setAttribute('id', 'article-title');
        }

        // 确保保留图片的src属性
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.hasAttribute('src') && img.hasAttribute('data-src')) {
                img.setAttribute('src', img.getAttribute('data-src'));
                img.removeAttribute('data-src');
            }
        });

        // 移除空的div和span元素
        this.removeEmptyElements(document);
    }

    /**
     * 移除空的元素
     */
    removeEmptyElements(document) {
        const emptyElements = document.querySelectorAll('div:empty, span:empty, p:empty');
        emptyElements.forEach(element => {
            if (element.textContent.trim() === '' && element.children.length === 0) {
                element.remove();
            }
        });
    }

    /**
     * 生成清理后的HTML
     */
    generateCleanHTML(document) {
        // 添加基本的UTF-8编码声明
        let html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n';
        
        // 添加标题
        const titleElement = document.querySelector('title');
        if (titleElement) {
            html += `<title>${titleElement.textContent}</title>\n`;
        }
        
        // 添加基本的meta信息
        const description = document.querySelector('meta[name="description"]');
        if (description) {
            html += `<meta name="description" content="${description.getAttribute('content')}">\n`;
        }
        
        const author = document.querySelector('meta[name="author"]');
        if (author) {
            html += `<meta name="author" content="${author.getAttribute('content')}">\n`;
        }
        
        html += '</head>\n<body>\n';
        
        // 添加主要内容
        const bodyContent = this.extractBodyContent(document);
        html += bodyContent;
        
        html += '\n</body>\n</html>';
        
        return html;
    }

    /**
     * 提取body内容
     */
    extractBodyContent(document) {
        let content = '';
        
        // 提取标题
        const title = document.querySelector('h1');
        if (title) {
            content += `<h1>${title.textContent.trim()}</h1>\n\n`;
        }
        
        // 提取作者和时间信息
        const authorElement = document.querySelector('#js_author_name, [id*="author"]');
        if (authorElement && authorElement.textContent.trim()) {
            content += `<p><strong>作者:</strong> ${authorElement.textContent.trim()}</p>\n`;
        }
        
        const timeElement = document.querySelector('#publish_time, [id*="time"]');
        if (timeElement && timeElement.textContent.trim()) {
            content += `<p><strong>发布时间:</strong> ${timeElement.textContent.trim()}</p>\n`;
        }
        
        const locationElement = document.querySelector('#js_ip_wording, [id*="ip"]');
        if (locationElement && locationElement.textContent.trim()) {
            content += `<p><strong>地区:</strong> ${locationElement.textContent.trim()}</p>\n\n`;
        }
        
        // 查找主要内容区域
        const mainContentArea = this.findMainContentArea(document);
        if (mainContentArea) {
            content += this.extractContentFromArea(mainContentArea);
        } else {
            // 只有在没有找到主要内容区域时才使用备用方法
            const fallbackContent = this.extractContentFallback(document);
            if (fallbackContent.trim()) {
                content += fallbackContent;
            }
        }
        
        return content;
    }

    /**
     * 查找主要内容区域
     */
    findMainContentArea(document) {
        // 尝试查找微信公众号文章的主要内容区域
        const selectors = [
            '#js_content',
            '.rich_media_content',
            '[id*="content"]',
            '[class*="content"]',
            'article',
            'main'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 100) {
                return element;
            }
        }
        
        return null;
    }

    /**
     * 从指定区域提取内容
     */
    extractContentFromArea(area) {
        let content = '';
        const processedElements = new Set(); // 用于去重
        
        // 在Zotero环境中，使用更兼容的方式遍历DOM节点
        const walker = this.createCompatibleTreeWalker(area);
        
        let node;
        while (node = walker.nextNode()) {
            if (processedElements.has(node)) continue;
            
            // 处理图片
            if (node.tagName === 'IMG') {
                const src = node.getAttribute('src') || node.getAttribute('data-src');
                const alt = node.getAttribute('alt') || '';
                if (src && !src.includes('data:image/svg')) {
                    content += `<img src="${src}" alt="${alt}">\n\n`;
                }
                processedElements.add(node);
                continue;
            }
            
            // 处理标题
            if (node.tagName && node.tagName.match(/^H[1-6]$/)) {
                const text = node.textContent.trim();
                if (text && text.length > 5) {
                    content += `<${node.tagName.toLowerCase()}>${text}</${node.tagName.toLowerCase()}>\n\n`;
                    processedElements.add(node);
                    // 标记所有子节点为已处理
                    const childWalker = this.createCompatibleTreeWalker(node);
                    let childNode;
                    while (childNode = childWalker.nextNode()) {
                        processedElements.add(childNode);
                    }
                }
                continue;
            }
            
            // 处理列表
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                const listContent = this.extractListContent(node);
                if (listContent.trim()) {
                    content += `<${node.tagName.toLowerCase()}>\n${listContent}</${node.tagName.toLowerCase()}>\n\n`;
                    processedElements.add(node);
                    // 标记所有子节点为已处理
                    const childWalker = this.createCompatibleTreeWalker(node);
                    let childNode;
                    while (childNode = childWalker.nextNode()) {
                        processedElements.add(childNode);
                    }
                }
                continue;
            }
            
            // 处理段落
            if (node.tagName === 'P') {
                const paraContent = this.extractParagraphContent(node);
                if (paraContent.trim()) {
                    content += `<p>${paraContent}</p>\n\n`;
                    processedElements.add(node);
                    // 标记所有子节点为已处理
                    const childWalker = this.createCompatibleTreeWalker(node);
                    let childNode;
                    while (childNode = childWalker.nextNode()) {
                        processedElements.add(childNode);
                    }
                }
                continue;
            }
            
            // 处理strong标签（保留strong标签并提取其内容）
            if (node.tagName === 'STRONG' || node.tagName === 'B') {
                const strongContent = this.extractStrongContent(node);
                if (strongContent.trim()) {
                    content += `<strong>${strongContent}</strong>\n\n`;
                    processedElements.add(node);
                    // 标记所有子节点为已处理
                    const childWalker = this.createCompatibleTreeWalker(node);
                    let childNode;
                    while (childNode = childWalker.nextNode()) {
                        processedElements.add(childNode);
                    }
                }
                continue;
            }
            
            // 处理独立的span元素（不在p、li内的）
            if (node.tagName === 'SPAN' && !this.isInsideTargetTags(node)) {
                const text = node.textContent.trim();
                if (text && text.length > 10 && !this.isNavigationOrUI(text)) {
                    // 独立的span转换为div
                    content += `<div>${text}</div>\n\n`;
                    processedElements.add(node);
                }
                continue;
            }
            
            // 处理div容器
            if (node.tagName === 'DIV') {
                const text = this.getDirectTextContent(node);
                if (text && text.length > 10 && !this.isNavigationOrUI(text)) {
                    content += `<div>${text}</div>\n\n`;
                    processedElements.add(node);
                } else {
                    // 如果div没有直接文本内容，检查是否有子元素需要处理
                    const fullText = node.textContent.trim();
                    if (fullText && fullText.length > 5 && !this.isNavigationOrUI(fullText)) {
                        // 检查是否是相邻div的一部分，需要合并处理
                        const nextSibling = node.nextElementSibling;
                        if (nextSibling && nextSibling.tagName === 'DIV') {
                            const nextText = nextSibling.textContent.trim();
                            if (nextText && !this.isNavigationOrUI(nextText)) {
                                // 合并相邻div的内容
                                const combinedText = fullText + nextText;
                                if (combinedText.length > 10) {
                                    content += `<div>${combinedText}</div>\n\n`;
                                    processedElements.add(node);
                                    processedElements.add(nextSibling);
                                }
                            }
                        } else {
                            // 单独处理这个div
                            content += `<div>${fullText}</div>\n\n`;
                            processedElements.add(node);
                        }
                    }
                }
            }
        }
        
        return content;
    }
    
    /**
     * 提取列表内容
     */
    extractListContent(listElement) {
        let content = '';
        const listItems = listElement.querySelectorAll('li');
        
        listItems.forEach(li => {
            const itemContent = this.extractListItemContent(li);
            if (itemContent.trim()) {
                content += `<li>${itemContent}</li>\n`;
            }
        });
        
        return content;
    }
    
    /**
     * 提取列表项内容
     */
    extractListItemContent(liElement) {
        let content = '';
        
        // 遍历li的所有子节点
        for (let child of liElement.childNodes) {
            if (child.nodeType === 3) { // Node.TEXT_NODE
                const text = child.textContent.trim();
                if (text) {
                    // 检查是否应该用span包装
                    if (this.shouldUseSpan(liElement)) {
                        content += `<span>${text}</span>`;
                    } else {
                        content += `<div>${text}</div>`;
                    }
                }
            } else if (child.nodeType === 1) { // Node.ELEMENT_NODE
                if (child.tagName === 'SPAN') {
                    const text = child.textContent.trim();
                    if (text) {
                        // 在li内的span，检查是否应该保留span
                        if (this.shouldUseSpan(liElement)) {
                            content += `<span>${text}</span>`;
                        } else {
                            content += `<div>${text}</div>`;
                        }
                    }
                } else if (child.tagName === 'IMG') {
                    const src = child.getAttribute('src') || child.getAttribute('data-src');
                    const alt = child.getAttribute('alt') || '';
                    if (src && !src.includes('data:image/svg')) {
                        content += `<img src="${src}" alt="${alt}">`;
                    }
                } else {
                    // 递归处理其他元素
                    const text = child.textContent.trim();
                    if (text && !this.isNavigationOrUI(text)) {
                        if (this.shouldUseSpan(liElement)) {
                            content += `<span>${text}</span>`;
                        } else {
                            content += `<div>${text}</div>`;
                        }
                    }
                }
            }
            
            // 在元素之间添加适当的空格或换行
            if (content && !content.endsWith(' ') && !content.endsWith('\n')) {
                content += ' ';
            }
        }
        
        return content.trim();
    }
    
    /**
     * 提取段落内容（保持原始HTML结构）
     */
    extractParagraphContent(pElement) {
        let content = '';
        
        // 遍历p的所有子节点
        for (let child of pElement.childNodes) {
            if (child.nodeType === 3) { // Node.TEXT_NODE
                const text = child.textContent.trim();
                if (text) {
                    content += text;
                }
            } else if (child.nodeType === 1) { // Node.ELEMENT_NODE
                if (child.tagName === 'STRONG' || child.tagName === 'B') {
                    // 保持strong标签的原始结构
                    content += this.preserveElementStructure(child);
                } else if (child.tagName === 'SPAN') {
                    // 保持span标签的原始结构
                    content += this.preserveElementStructure(child);
                } else if (child.tagName === 'IMG') {
                    const src = child.getAttribute('src') || child.getAttribute('data-src');
                    const alt = child.getAttribute('alt') || '';
                    if (src && !src.includes('data:image/svg')) {
                        content += `<img src="${src}" alt="${alt}">`;
                    }
                } else {
                    // 其他元素，提取文本内容
                    const text = child.textContent.trim();
                    if (text) {
                        content += text;
                    }
                }
            }
            
            // 在元素之间添加适当的空格
            if (content && !content.endsWith(' ') && !content.endsWith('\n')) {
                content += ' ';
            }
        }
        
        return content.trim();
    }

    /**
     * 提取strong元素内容
     */
    extractStrongContent(strongElement) {
        let content = '';
        
        // 遍历strong的所有子节点
        for (let child of strongElement.childNodes) {
            if (child.nodeType === 3) { // Node.TEXT_NODE
                const text = child.textContent.trim();
                if (text) {
                    content += text;
                }
            } else if (child.nodeType === 1) { // Node.ELEMENT_NODE
                if (child.tagName === 'SPAN') {
                    // 处理嵌套的span
                    const spanText = this.extractNestedSpanContent(child);
                    if (spanText) {
                        content += spanText;
                    }
                } else {
                    // 其他元素，提取文本内容
                    const text = child.textContent.trim();
                    if (text) {
                        content += text;
                    }
                }
            }
        }
        
        return content.trim();
    }

    /**
     * 保持元素结构（用于段落内的元素）
     */
    preserveElementStructure(element) {
        let result = `<${element.tagName.toLowerCase()}`;
        
        // 保留必要的属性
        const attrs = element.attributes || [];
        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            if (this.preservedAttributes.has(attr.name)) {
                result += ` ${attr.name}="${attr.value}"`;
            }
        }
        
        result += '>';
        
        // 处理子节点
        for (let child of element.childNodes) {
            if (child.nodeType === 3) { // Text node
                result += child.textContent;
            } else if (child.nodeType === 1) { // Element node
                result += this.preserveElementStructure(child);
            }
        }
        
        result += `</${element.tagName.toLowerCase()}>`;
        return result;
    }

    /**
     * 提取嵌套span内容
     */
    extractNestedSpanContent(spanElement) {
        let content = '';
        
        // 遍历span的所有子节点
        for (let child of spanElement.childNodes) {
            if (child.nodeType === 3) { // Node.TEXT_NODE
                const text = child.textContent.trim();
                if (text) {
                    content += text;
                }
            } else if (child.nodeType === 1) { // Node.ELEMENT_NODE
                if (child.tagName === 'SPAN') {
                    // 递归处理嵌套的span
                    const nestedSpanText = this.extractNestedSpanContent(child);
                    if (nestedSpanText) {
                        content += nestedSpanText;
                    }
                } else {
                    // 其他元素，提取文本内容
                    const text = child.textContent.trim();
                    if (text) {
                        content += text;
                    }
                }
            }
        }
        
        return content.trim();
    }

    /**
     * 检查元素是否在目标标签内
     */
    isInsideTargetTags(element) {
        const targetTags = ['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
        let parent = element.parentElement;
        while (parent) {
            if (targetTags.includes(parent.tagName)) {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }

    /**
     * 判断是否应该使用span标签
     */
    shouldUseSpan(element) {
        // 检查父元素类型来决定是否使用span
        const parent = element.parentElement;
        if (parent) {
            return parent.tagName === 'P' || parent.tagName === 'LI';
        }
        return false;
    }

    /**
     * 获取元素的直接文本内容（不包括子元素）
     */
    getDirectTextContent(element) {
        let text = '';
        for (let child of element.childNodes) {
            if (child.nodeType === 3) { // Node.TEXT_NODE
                text += child.textContent;
            }
        }
        return text.trim();
    }

    /**
     * 备用内容提取方法
     */
    extractContentFallback(document) {
        let content = '';
        const processedElements = new Set();
        
        // 遍历body下的所有元素
         const body = document.body || document.documentElement;
         if (!body) return content;
         
         const walker = this.createCompatibleTreeWalker(body);
        
        let node;
        while (node = walker.nextNode()) {
            if (processedElements.has(node)) continue;
            
            const tagName = node.tagName;
            
            // 处理图片
            if (tagName === 'IMG') {
                const src = node.getAttribute('src') || node.getAttribute('data-src');
                const alt = node.getAttribute('alt') || '';
                if (src && !src.includes('data:image/svg')) {
                    content += `<img src="${src}" alt="${alt}">\n\n`;
                }
                processedElements.add(node);
                continue;
            }
            
            // 处理标题
            if (tagName && tagName.match(/^H[1-6]$/)) {
                const text = node.textContent.trim();
                if (text && text.length > 5) {
                    content += `<${tagName.toLowerCase()}>${text}</${tagName.toLowerCase()}>\n\n`;
                    processedElements.add(node);
                }
                continue;
            }
            
            // 处理列表
            if (tagName === 'UL' || tagName === 'OL') {
                const listContent = this.extractListContent(node);
                if (listContent.trim()) {
                    content += `<${tagName.toLowerCase()}>\n${listContent}</${tagName.toLowerCase()}>\n\n`;
                    processedElements.add(node);
                }
                continue;
            }
            
            // 处理段落
            if (tagName === 'P') {
                const paraContent = this.extractParagraphContent(node);
                if (paraContent.trim()) {
                    content += `<p>${paraContent}</p>\n\n`;
                    processedElements.add(node);
                }
                continue;
            }
            
            // 处理div
            if (tagName === 'DIV') {
                const text = node.textContent.trim();
                if (text && text.length > 10 && !this.isNavigationOrUI(text)) {
                    const paragraphs = this.splitIntoParagraphs(text);
                    content += paragraphs.map(p => `<p>${p}</p>`).join('\n') + '\n\n';
                    processedElements.add(node);
                }
            }
        }
        
        return content;
    }

    /**
     * 判断文本是否为导航或UI元素
     */
    isNavigationOrUI(text) {
        const uiKeywords = [
            '点击', '查看', '更多', '展开', '收起', '关闭', '返回', '首页', '登录', '注册',
            '分享', '转发', '评论', '点赞', '收藏', '关注', '取消', '确定', '提交',
            '搜索', '筛选', '排序', '刷新', '加载', '下一页', '上一页', '跳转',
            '菜单', '导航', '标签', '按钮', '链接', '广告', '推广', '赞助',
            'click', 'view', 'more', 'expand', 'collapse', 'close', 'back', 'home',
            'login', 'register', 'share', 'forward', 'comment', 'like', 'favorite',
            'follow', 'cancel', 'confirm', 'submit', 'search', 'filter', 'sort',
            'refresh', 'load', 'next', 'previous', 'jump', 'menu', 'navigation',
            'tab', 'button', 'link', 'ad', 'advertisement', 'sponsor'
        ];
        
        const lowerText = text.toLowerCase();
        const hasSubstantialContent = text.length > 50;
        
        // 如果文本很长，可能包含实质内容，不应该被过滤
        if (hasSubstantialContent) {
            // 检查是否主要由UI关键词组成
            const uiWordCount = uiKeywords.filter(keyword => lowerText.includes(keyword)).length;
            return uiWordCount > 3; // 如果包含超过3个UI关键词，认为是UI文本
        }
        
        // 短文本，检查是否包含UI关键词
        return uiKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * 将长文本分割成段落
     */
    splitIntoParagraphs(text) {
        const sentences = text.split(/[。！？.!?]/);
        const paragraphs = [];
        let currentPara = '';
        
        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i].trim();
            if (currentPara.length + sentence.length > 200 && currentPara) {
                paragraphs.push(currentPara.trim());
                currentPara = sentence;
            } else {
                currentPara += sentence;
            }
        }
        
        if (currentPara) {
            paragraphs.push(currentPara.trim());
        }
        
        return paragraphs.filter(p => p.length > 0);
     }

    /**
     * 创建兼容的TreeWalker，适配Zotero环境
     */
    createCompatibleTreeWalker(root) {
        try {
            // 尝试使用标准的TreeWalker
            if (root.ownerDocument && root.ownerDocument.createTreeWalker) {
                return root.ownerDocument.createTreeWalker(
                    root,
                    1, // NodeFilter.SHOW_ELEMENT
                    null,
                    false
                );
            }
            
            // 如果标准方法不可用，使用备用方法
            return this.createFallbackTreeWalker(root);
        } catch (error) {
            this.warn('TreeWalker创建失败，使用备用方法:', error);
            return this.createFallbackTreeWalker(root);
        }
    }

    /**
     * 备用TreeWalker实现
     */
    createFallbackTreeWalker(root) {
        const elements = [];
        
        // 递归收集所有元素节点
        const collectElements = (node) => {
            if (node.nodeType === 1) { // Element node
                elements.push(node);
            }
            for (let child of node.childNodes || []) {
                collectElements(child);
            }
        };
        
        collectElements(root);
        
        let currentIndex = -1;
        
        return {
            nextNode: () => {
                currentIndex++;
                return currentIndex < elements.length ? elements[currentIndex] : null;
            }
        };
    }

    /**
     * 兼容的日志方法
     */
    log(message, ...args) {
        if (typeof console !== 'undefined' && console.log) {
            console.log(message, ...args);
        }
    }

    warn(message, ...args) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(message, ...args);
        }
    }

    error(message, ...args) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(message, ...args);
        }
    }
 }

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HTMLCleaner;
} else if (typeof window !== 'undefined') {
    window.HTMLCleaner = HTMLCleaner;
}