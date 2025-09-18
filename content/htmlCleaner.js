/**
 * HTML清理和瘦身工具 - Zotero插件版本
 * 基于html_cleaner2.mjs的逻辑，适配Zotero插件环境
 * 版本: 3.0.0 - 使用html_cleaner2.mjs的完整逻辑
 */
class HTMLCleaner {
    constructor() {
        this.preservedTags = new Set([
            'html', 'head', 'body', 'title', 'meta',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'div', 'span', 'section', 'article',
            'strong', 'em', 'b', 'i', 'u',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'a', 'img', 'figure', 'figcaption',
            'code', 'pre', 'blockquote',
            'table', 'thead', 'tbody', 'tr', 'td', 'th',
            'br', 'hr'
        ]);
        
        this.removedAttributes = new Set([
            'style', 'class', 'id', 'onclick', 'onload', 'onerror',
            'data-*', 'aria-*', 'role', 'tabindex'
        ]);
        
        this.preservedAttributes = new Set([
            'href', 'src', 'alt', 'title', 'target',
            'charset', 'content', 'name', 'http-equiv'
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
            this.log(`原文件大小: ${(htmlContent.length / 1024).toFixed(2)} KB`);
            
            // 在Zotero环境中创建DOM文档
            const document = this.createDocument(htmlContent);
            
            // 执行清理操作 - 使用html_cleaner2.mjs的逻辑
            const cleanedHtml = this.clean(document);
            
            this.log(`清理后大小: ${(cleanedHtml.length / 1024).toFixed(2)} KB`);
            this.log('HTML清理完成');
            
            return cleanedHtml;
        } catch (error) {
            this.error('处理HTML内容时出错:', error);
            return htmlContent; // 出错时返回原内容
        }
    }

    /**
     * 在Zotero环境中创建DOM文档
     */
    createDocument(htmlContent) {
        try {
            // 尝试使用Zotero的内置DOM解析器
            if (typeof Components !== 'undefined' && Components.classes) {
                const parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                    .createInstance(Components.interfaces.nsIDOMParser);
                return parser.parseFromString(htmlContent, "text/html");
            }
            
            // 备用方案：使用标准DOMParser
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                return parser.parseFromString(htmlContent, 'text/html');
            }
            
            // 最后备用方案：创建一个简单的文档对象
            throw new Error('无法创建DOM解析器');
            
        } catch (error) {
            this.error('创建DOM文档失败:', error);
            // 使用字符串处理作为最后的备用方案
            return this.createFallbackDocument(htmlContent);
        }
    }

    /**
     * 备用文档创建方法
     */
    createFallbackDocument(htmlContent) {
        // 创建一个模拟的文档对象，用于字符串处理
        return {
            documentElement: {
                innerHTML: htmlContent
            },
            body: {
                innerHTML: this.extractBodyContent(htmlContent)
            },
            head: {
                innerHTML: this.extractHeadContent(htmlContent)
            },
            querySelectorAll: (selector) => [],
            querySelector: (selector) => null,
            createElement: (tagName) => ({ tagName: tagName.toUpperCase() })
        };
    }

    /**
     * 提取body内容
     */
    extractBodyContent(htmlContent) {
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        return bodyMatch ? bodyMatch[1] : htmlContent;
    }

    /**
     * 提取head内容
     */
    extractHeadContent(htmlContent) {
        const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        return headMatch ? headMatch[1] : '';
    }

    /**
     * 清理HTML文档 - 核心清理方法
     */
    clean(document) {
        this.log('开始执行清理操作...');
        
        try {
            // 检查是否是真实的DOM文档
            if (this.isRealDocument(document)) {
                return this.cleanWithDOM(document);
            } else {
                // 使用字符串处理方法
                return this.cleanWithString(document);
            }
        } catch (error) {
            this.error('清理过程出错，使用备用方法', error);
            return this.cleanWithString(document);
        }
    }

    /**
     * 检查是否是真实的DOM文档
     */
    isRealDocument(document) {
        return document && 
               typeof document.querySelectorAll === 'function' &&
               typeof document.createElement === 'function' &&
               document.documentElement;
    }

    /**
     * 使用DOM方法清理
     */
    cleanWithDOM(document) {
        this.log('使用DOM方法清理');
        
        // 1. 移除所有style和script标签
        this.log('步骤1: 移除样式和脚本');
        this.removeStylesAndScripts(document);

        // 2. 清理meta标签，只保留必要的
        this.log('步骤2: 清理meta标签');
        this.cleanMetaTags(document);

        // 3. 简化HTML结构
        this.log('步骤3: 简化HTML结构');
        this.simplifyStructure(document);

        // 4. 清理属性
        this.log('步骤4: 清理元素属性');
        this.cleanAttributes(document);

        // 5. 移除空标签和无用标签
        this.log('步骤5: 移除空标签');
        this.removeEmptyTags(document);

        // 6. 优化文本内容
        this.log('步骤6: 优化文本内容');
        this.optimizeTextContent(document);

        this.log('DOM清理操作完成，开始序列化...');
        return this.serializeDocument(document);
    }

    /**
     * 使用字符串方法清理
     */
    cleanWithString(document) {
        this.log('使用字符串方法清理');
        
        let htmlContent = '';
        if (document.documentElement && document.documentElement.innerHTML) {
            htmlContent = document.documentElement.innerHTML;
        } else if (document.innerHTML) {
            htmlContent = document.innerHTML;
        } else {
            htmlContent = document.toString();
        }

        // 执行字符串清理
        htmlContent = this.stringCleanHTML(htmlContent);
        
        return htmlContent;
    }

    /**
     * 字符串清理方法
     */
    stringCleanHTML(htmlContent) {
        this.log('执行字符串清理...');
        
        // 1. 移除style标签和内容
        htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        // 2. 移除script标签和内容
        htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        
        // 3. 移除link样式表
        htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
        
        // 4. 移除内联样式属性
        htmlContent = htmlContent.replace(/\s+style=["'][^"']*["']/gi, '');
        
        // 5. 移除class属性
        htmlContent = htmlContent.replace(/\s+class=["'][^"']*["']/gi, '');
        
        // 6. 移除id属性（保留一些重要的）
        htmlContent = htmlContent.replace(/\s+id=["'](?!js_content|js_author|js_name)[^"']*["']/gi, '');
        
        // 7. 移除事件处理属性
        htmlContent = htmlContent.replace(/\s+on\w+=["'][^"']*["']/gi, '');
        
        // 8. 移除data-*属性（保留重要的）
        htmlContent = htmlContent.replace(/\s+data-(?!src|alt)[^=]*=["'][^"']*["']/gi, '');
        
        // 9. 清理多余的空白
        htmlContent = htmlContent.replace(/\s+/g, ' ');
        htmlContent = htmlContent.replace(/>\s+</g, '><');
        
        // 10. 构建基本的HTML结构
        const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : '清理后的文档';
        
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
        
        const cleanHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body>
${bodyContent}
</body>
</html>`;
        
        this.log('字符串清理完成');
        return cleanHTML;
    }

    /**
     * 移除所有CSS样式和JavaScript
     */
    removeStylesAndScripts(document) {
        // 移除style标签
        const styleElements = document.querySelectorAll('style');
        styleElements.forEach(el => el.remove());
        this.log(`移除了 ${styleElements.length} 个 <style> 标签`);

        // 移除script标签
        const scriptElements = document.querySelectorAll('script');
        scriptElements.forEach(el => el.remove());

        // 移除link标签中的样式表
        const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
        linkElements.forEach(el => el.remove());
    }

    /**
     * 清理meta标签，只保留编码相关的
     */
    cleanMetaTags(document) {
        const metaElements = document.querySelectorAll('meta');
        metaElements.forEach(meta => {
            const charset = meta.getAttribute('charset');
            const httpEquiv = meta.getAttribute('http-equiv');
            const name = meta.getAttribute('name');
            
            // 只保留编码相关的meta标签
            if (!charset && 
                httpEquiv !== 'Content-Type' && 
                name !== 'viewport' &&
                name !== 'description') {
                meta.remove();
            }
        });
    }

    /**
     * 简化HTML结构
     */
    simplifyStructure(document) {
        // 移除不必要的div嵌套
        this.unwrapUnnecessaryDivs(document);
        
        // 移除微信特定的标签和属性
        this.removeWechatSpecificElements(document);
        
        // 移除导航、侧边栏等非内容区域
        this.removeNonContentAreas(document);
        
        // 移除HTML注释
        this.removeComments(document);
        
        // 简化meta标签
        this.simplifyMetaTags(document);
        
        // 移除多余的空白和换行
        this.removeExtraWhitespace(document);
    }

    /**
     * 展开不必要的div嵌套
     */
    unwrapUnnecessaryDivs(document) {
        let changed = true;
        while (changed) {
            changed = false;
            const divs = document.querySelectorAll('div');
            
            divs.forEach(div => {
                // 如果div只有一个子元素且没有有用的属性，考虑展开
                if (div.children.length === 1 && 
                    !this.hasPreservedAttributes(div) &&
                    !this.hasSignificantTextContent(div)) {
                    
                    const child = div.children[0];
                    // 避免创建无意义的嵌套
                    if (child.tagName !== 'DIV' || this.hasPreservedAttributes(child)) {
                        try {
                            div.parentNode.replaceChild(child, div);
                            changed = true;
                        } catch (e) {
                            // 忽略替换失败的情况
                        }
                    }
                }
                
                // 移除空的div
                else if (!div.textContent.trim() && 
                         div.children.length === 0 &&
                         !this.hasPreservedAttributes(div)) {
                    div.remove();
                    changed = true;
                }
            });
        }
    }

    /**
     * 移除微信特定的元素
     */
    removeWechatSpecificElements(document) {
        // 移除微信相关的特定元素
        const wechatSelectors = [
            'mpvoice',
            'mpcps',
            'mpprofile'
        ];
        
        wechatSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            } catch (e) {
                // 忽略无效的选择器
            }
        });
    }

    /**
     * 移除非内容区域
     */
    removeNonContentAreas(document) {
        const nonContentSelectors = [
            'nav', 'header', 'footer', 'aside',
            '.navigation', '.sidebar', '.menu',
            '.advertisement', '.ad', '.banner'
        ];
        
        nonContentSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
    }

    /**
     * 清理元素属性
     */
    cleanAttributes(document) {
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            const attributes = Array.from(element.attributes);
            attributes.forEach(attr => {
                const attrName = attr.name.toLowerCase();
                
                // 移除样式相关属性
                if (attrName === 'style' || 
                    attrName === 'class' || 
                    attrName.startsWith('data-') ||
                    attrName.startsWith('aria-') ||
                    attrName.startsWith('on')) {
                    
                    // 保留一些重要的data属性
                    if (attrName === 'data-src' || attrName === 'data-alt') {
                        return;
                    }
                    
                    element.removeAttribute(attr.name);
                }
            });
        });
    }

    /**
     * 移除空标签和无用标签
     */
    removeEmptyTags(document) {
        let changed = true;
        while (changed) {
            changed = false;
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach(element => {
                if (this.shouldRemoveElement(element)) {
                    element.remove();
                    changed = true;
                }
            });
        }
    }

    /**
     * 判断是否应该移除元素
     */
    shouldRemoveElement(element) {
        const tagName = element.tagName.toLowerCase();
        
        // 不移除这些重要标签
        if (['html', 'head', 'body', 'title', 'meta', 'img', 'br', 'hr'].includes(tagName)) {
            return false;
        }
        
        // 移除空的且没有重要属性的元素
        if (!element.textContent.trim() && 
            element.children.length === 0 &&
            !this.hasPreservedAttributes(element)) {
            return true;
        }
        
        return false;
    }

    /**
     * 检查元素是否有需要保留的属性
     */
    hasPreservedAttributes(element) {
        const attributes = Array.from(element.attributes);
        return attributes.some(attr => 
            this.preservedAttributes.has(attr.name.toLowerCase())
        );
    }

    /**
     * 检查元素是否有重要的文本内容
     */
    hasSignificantTextContent(element) {
        const text = element.textContent.trim();
        return text.length > 0 && text.length > 10; // 至少10个字符才算有意义
    }

    /**
     * 优化文本内容
     */
    optimizeTextContent(document) {
        // 清理多余的空白字符
        const textNodes = this.getAllTextNodes(document.body);
        textNodes.forEach(node => {
            node.textContent = node.textContent.replace(/\s+/g, ' ').trim();
        });
    }

    /**
     * 获取所有文本节点
     */
    getAllTextNodes(element) {
        const textNodes = [];
        if (!element) return textNodes;
        
        const walker = element.ownerDocument.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        }
        
        return textNodes;
    }

    /**
     * 移除HTML注释
     */
    removeComments(document) {
        const walker = document.createTreeWalker(
            document,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        
        const comments = [];
        let node;
        while (node = walker.nextNode()) {
            comments.push(node);
        }
        
        comments.forEach(comment => comment.remove());
    }

    /**
     * 简化meta标签
     */
    simplifyMetaTags(document) {
        const metaElements = document.querySelectorAll('meta');
        metaElements.forEach(meta => {
            const charset = meta.getAttribute('charset');
            const name = meta.getAttribute('name');
            
            // 只保留最基本的meta标签
            if (!charset && name !== 'viewport') {
                meta.remove();
            }
        });
    }

    /**
     * 移除多余的空白和换行
     */
    removeExtraWhitespace(document) {
        // 移除head中的多余空白
        const head = document.head;
        if (head) {
            this.cleanWhitespaceInElement(head);
        }
        
        // 移除body中的多余空白
        const body = document.body;
        if (body) {
            this.cleanWhitespaceInElement(body);
        }
    }

    /**
     * 清理元素中的空白
     */
    cleanWhitespaceInElement(element) {
        if (!element) return;
        
        const walker = element.ownerDocument.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        textNodes.forEach(textNode => {
            // 如果是纯空白的文本节点，且不在重要标签内，则移除
            if (/^\s+$/.test(textNode.textContent)) {
                const parent = textNode.parentNode;
                if (parent && !['pre', 'code', 'textarea'].includes(parent.tagName.toLowerCase())) {
                    textNode.remove();
                }
            }
        });
    }

    /**
     * 序列化文档为HTML字符串
     */
    serializeDocument(document) {
        try {
            // 尝试使用Zotero的内置序列化器
            if (typeof Components !== 'undefined' && Components.classes) {
                const serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
                    .createInstance(Components.interfaces.nsIDOMSerializer);
                return serializer.serializeToString(document);
            }
            
            // 备用方案：使用标准XMLSerializer
            if (typeof XMLSerializer !== 'undefined') {
                const serializer = new XMLSerializer();
                return serializer.serializeToString(document);
            }
            
            // 最后备用方案：使用字符串拼接
            return this.fallbackSerialize(document);
            
        } catch (error) {
            this.error('序列化文档失败:', error);
            return this.fallbackSerialize(document);
        }
    }

    /**
     * 备用序列化方法
     */
    fallbackSerialize(document) {
        try {
            // 如果是模拟文档对象，直接返回处理后的HTML
            if (document.documentElement && document.documentElement.innerHTML) {
                return this.buildCleanHTML(document);
            }
            
            // 如果有innerHTML属性，使用它
            if (document.innerHTML) {
                return document.innerHTML;
            }
            
            // 如果有outerHTML属性，使用它
            if (document.outerHTML) {
                return document.outerHTML;
            }
            
            // 最后的备用方案
            return this.buildBasicHTML(document);
            
        } catch (error) {
            this.error('备用序列化失败:', error);
            return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><p>HTML清理失败</p></body></html>';
        }
    }

    /**
     * 构建清理后的HTML
     */
    buildCleanHTML(document) {
        let html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n';
        
        // 添加标题
        if (document.head && document.head.innerHTML) {
            const titleMatch = document.head.innerHTML.match(/<title[^>]*>(.*?)<\/title>/i);
            if (titleMatch) {
                html += `<title>${titleMatch[1]}</title>\n`;
            }
        }
        
        html += '</head>\n<body>\n';
        
        // 添加body内容
        if (document.body && document.body.innerHTML) {
            html += document.body.innerHTML;
        }
        
        html += '\n</body>\n</html>';
        
        return html;
    }

    /**
     * 构建基本HTML结构
     */
    buildBasicHTML(document) {
        return '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>清理后的文档</title>\n</head>\n<body>\n<p>文档已清理</p>\n</body>\n</html>';
    }

    /**
     * 日志输出
     */
    log(message) {
        if (typeof Zotero !== 'undefined' && Zotero.debug) {
            Zotero.debug(`[WxHtmlCleaner] ${message}`);
        } else if (typeof console !== 'undefined') {
            console.log(`[WxHtmlCleaner] ${message}`);
        }
    }

    /**
     * 错误输出
     */
    error(message, error) {
        if (typeof Zotero !== 'undefined' && Zotero.debug) {
            Zotero.debug(`[WxHtmlCleaner ERROR] ${message}: ${error}`);
        } else if (typeof console !== 'undefined') {
            console.error(`[WxHtmlCleaner ERROR] ${message}`, error);
        }
    }
}

// 导出类供Zotero插件使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HTMLCleaner;
} else if (typeof window !== 'undefined') {
    window.HTMLCleaner = HTMLCleaner;
}