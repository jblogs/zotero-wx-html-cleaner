// Zotero 7 微信HTML清理插件 Bootstrap

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function install() {
    // 插件安装时执行
}

function uninstall() {
    // 插件卸载时执行
}

function startup({ id, version, resourceURI, rootURI = resourceURI.spec }) {
    // 插件启动时执行
    Services.scriptloader.loadSubScript(rootURI + "content/htmlCleaner.js");
    
    // 注册插件功能
    if (typeof Zotero !== 'undefined') {
        WxHtmlCleanerPlugin.init();
    }
}

function shutdown() {
    // 插件关闭时执行
    if (typeof WxHtmlCleanerPlugin !== 'undefined') {
        WxHtmlCleanerPlugin.shutdown();
    }
}

// 主插件对象
var WxHtmlCleanerPlugin = {
    
    init: function() {
        // 等待Zotero完全加载
        if (Zotero.initialized) {
            this.addToAllWindows();
        } else {
            Zotero.addShutdownListener(() => this.shutdown());
            Zotero.uiReadyPromise.then(() => this.addToAllWindows());
        }
    },
    
    addToAllWindows: function() {
        // 为所有现有窗口添加功能
        var windows = Services.wm.getEnumerator("navigator:browser");
        while (windows.hasMoreElements()) {
            this.addToWindow(windows.getNext());
        }
        
        // 监听新窗口
        Services.wm.addListener(this.windowListener);
    },
    
    addToWindow: function(window) {
        if (!window.ZoteroPane) return;
        
        // 添加右键菜单项
        this.addContextMenu(window);
    },
    
    addContextMenu: function(window) {
        var doc = window.document;
        
        // 查找附件右键菜单
        var attachmentPopup = doc.getElementById("zotero-attachment-popup");
        if (attachmentPopup) {
            // 添加分隔符
            var separator = doc.createXULElement("menuseparator");
            separator.id = "wx-html-cleaner-separator";
            attachmentPopup.appendChild(separator);
            
            // 添加菜单项
            var menuItem = doc.createXULElement("menuitem");
            menuItem.id = "wx-html-cleaner-menuitem";
            menuItem.setAttribute("label", "清理微信HTML");
            menuItem.addEventListener("command", () => this.cleanSelectedHTML(window));
            attachmentPopup.appendChild(menuItem);
        }
        
        // 查找条目右键菜单
        var itemMenu = doc.getElementById("zotero-itemmenu");
        if (itemMenu) {
            // 添加分隔符
            var separator2 = doc.createXULElement("menuseparator");
            separator2.id = "wx-html-cleaner-item-separator";
            itemMenu.appendChild(separator2);
            
            // 添加菜单项
            var menuItem2 = doc.createXULElement("menuitem");
            menuItem2.id = "wx-html-cleaner-item-menuitem";
            menuItem2.setAttribute("label", "清理微信HTML");
            menuItem2.addEventListener("command", () => this.cleanSelectedHTML(window));
            itemMenu.appendChild(menuItem2);
        }
        
        // 监听选择变化以更新菜单可见性
        if (window.ZoteroPane && window.ZoteroPane.itemsView) {
            window.ZoteroPane.itemsView.addEventListener('select', () => {
                this.updateMenuVisibility(window);
            });
        }
    },
    
    updateMenuVisibility: function(window) {
        var menuItem = window.document.getElementById('wx-html-cleaner-menuitem');
        var itemMenuItem = window.document.getElementById('wx-html-cleaner-item-menuitem');
        
        var hasHTMLAttachment = this.hasHTMLAttachment(window);
        
        if (menuItem) menuItem.hidden = !hasHTMLAttachment;
        if (itemMenuItem) itemMenuItem.hidden = !hasHTMLAttachment;
    },
    
    hasHTMLAttachment: function(window) {
        if (!window.ZoteroPane) return false;
        
        var selectedItems = window.ZoteroPane.getSelectedItems();
        if (!selectedItems || selectedItems.length === 0) {
            return false;
        }
        
        for (let item of selectedItems) {
            if (item.isAttachment() && item.attachmentContentType === 'text/html') {
                return true;
            }
            
            // 检查子附件
            var attachments = item.getAttachments();
            for (let attachmentID of attachments) {
                var attachment = Zotero.Items.get(attachmentID);
                if (attachment && attachment.attachmentContentType === 'text/html') {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    cleanSelectedHTML: async function(window) {
        try {
            if (!window.ZoteroPane) return;
            
            var selectedItems = window.ZoteroPane.getSelectedItems();
            if (!selectedItems || selectedItems.length === 0) {
                window.alert("请先选择一个包含HTML附件的条目");
                return;
            }
            
            var htmlAttachments = [];
            
            // 收集所有HTML附件
            for (let item of selectedItems) {
                if (item.isAttachment() && item.attachmentContentType === 'text/html') {
                    htmlAttachments.push(item);
                } else {
                    // 检查子附件
                    var attachments = item.getAttachments();
                    for (let attachmentID of attachments) {
                        var attachment = Zotero.Items.get(attachmentID);
                        if (attachment && attachment.attachmentContentType === 'text/html') {
                            htmlAttachments.push(attachment);
                        }
                    }
                }
            }
            
            if (htmlAttachments.length === 0) {
                window.alert("未找到HTML附件");
                return;
            }
            
            // 显示进度提示
            var progressWindow = new Zotero.ProgressWindow();
            progressWindow.changeHeadline("正在清理HTML文件...");
            progressWindow.show();
            
            var results = [];
            var successCount = 0;
            var failCount = 0;
            
            // 处理每个HTML附件
            for (let i = 0; i < htmlAttachments.length; i++) {
                let attachment = htmlAttachments[i];
                progressWindow.addDescription(`正在处理: ${attachment.attachmentFilename || 'untitled.html'} (${i + 1}/${htmlAttachments.length})`);
                
                var result = await this.processHTMLAttachment(attachment);
                results.push(result);
                
                if (result.success) {
                    successCount++;
                    progressWindow.addDescription(`✓ 成功: ${result.originalName} -> ${result.cleanedName}`);
                } else {
                    failCount++;
                    progressWindow.addDescription(`✗ 失败: ${result.originalName} - ${result.error}`);
                }
            }
            
            progressWindow.close();
            
            // 只在有失败的情况下才显示弹窗
            if (failCount > 0) {
                var message = `清理完成!\n成功: ${successCount} 个文件\n失败: ${failCount} 个文件`;
                message += "\n\n失败的文件:\n";
                for (let result of results) {
                    if (!result.success) {
                        message += `• ${result.originalName}: ${result.error}\n`;
                    }
                }
                window.alert(message);
            }
            // 成功时不弹窗，只在控制台输出日志
            else if (successCount > 0) {
                Zotero.debug(`WxHtmlCleaner: 成功清理 ${successCount} 个HTML文件`);
            }
            
        } catch (error) {
            Zotero.debug("WxHtmlCleaner错误: " + error);
            window.alert("清理过程中发生错误: " + error.message);
        }
    },
    
    processHTMLAttachment: async function(attachment) {
        try {
            // 获取附件文件路径
            var file = attachment.getFile();
            if (!file || !file.exists()) {
                throw new Error("附件文件不存在: " + attachment.attachmentFilename);
            }
            
            Zotero.debug("WxHtmlCleaner: 开始处理附件 " + attachment.attachmentFilename);
            
            // 读取HTML内容
            var htmlContent = await Zotero.File.getContentsAsync(file.path);
            if (!htmlContent || htmlContent.trim().length === 0) {
                throw new Error("HTML文件内容为空");
            }
            
            // 使用HTMLCleaner清理内容
             var cleaner = new HTMLCleaner();
             var cleanedContent = await cleaner.cleanHTMLContent(htmlContent);
            
            if (!cleanedContent || cleanedContent.trim().length === 0) {
                throw new Error("清理后的内容为空");
            }
            
            // 从HTML内容中提取title作为文件名
            var titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
            var title = titleMatch ? titleMatch[1].trim() : "";
            
            // 清理title，移除HTML标签和特殊字符
            if (title) {
                title = title.replace(/<[^>]*>/g, ''); // 移除HTML标签
                title = title.replace(/[<>:"/\\|?*]/g, ''); // 移除文件名不允许的字符
                title = title.replace(/\s+/g, ' ').trim(); // 规范化空格
            }
            
            // 如果没有title或title为空，使用原文件名
            if (!title) {
                var originalName = attachment.attachmentFilename || "untitled.html";
                title = originalName.replace(/\.html?$/i, '');
            }
            
            // 截断title到20个字符左右
            if (title.length > 20) {
                title = title.substring(0, 20);
            }
            
            var cleanedName = title + '_clean.html';
            
            // 创建临时文件
            var tempFile = Zotero.getTempDirectory();
            tempFile.append(cleanedName);
            
            // 写入清理后的内容
            await Zotero.File.putContentsAsync(tempFile.path, cleanedContent);
            
            // 获取父条目
            var parentItem;
            if (attachment.isAttachment() && attachment.parentItem) {
                parentItem = attachment.parentItem;
            } else if (attachment.isAttachment()) {
                // 如果是顶级附件，创建一个新的父项目
                var originalName = attachment.attachmentFilename || "untitled.html";
                parentItem = new Zotero.Item('webpage');
                parentItem.setField('title', '微信文章: ' + originalName);
                parentItem.setField('url', 'about:blank');
                await parentItem.saveTx();
            } else {
                parentItem = attachment;
            }
            
            // 创建新的附件
            var newAttachment = await Zotero.Attachments.importFromFile({
                file: tempFile,
                parentItemID: parentItem.id,
                title: cleanedName,
                contentType: 'text/html'
            });
            
            // 添加标签标识这是清理后的文件
            newAttachment.addTag('wx-html-cleaned');
            await newAttachment.saveTx();
            
            // 清理临时文件
            if (tempFile.exists()) {
                tempFile.remove(false);
            }
            
            Zotero.debug("WxHtmlCleaner: 成功处理附件 " + originalName + " -> " + cleanedName);
            
            return {
                success: true,
                originalName: originalName,
                cleanedName: cleanedName,
                newAttachmentID: newAttachment.id
            };
            
        } catch (error) {
            Zotero.debug("WxHtmlCleaner处理附件错误: " + error);
            return {
                success: false,
                originalName: attachment.attachmentFilename || "unknown",
                error: error.message
            };
        }
    },
    
    removeFromWindow: function(window) {
        // 移除菜单项
        var elements = [
            "wx-html-cleaner-separator",
            "wx-html-cleaner-menuitem", 
            "wx-html-cleaner-item-separator",
            "wx-html-cleaner-item-menuitem"
        ];
        
        for (let id of elements) {
            var element = window.document.getElementById(id);
            if (element) {
                element.remove();
            }
        }
    },
    
    windowListener: {
        onOpenWindow: function(xulWindow) {
            var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                                  .getInterface(Components.interfaces.nsIDOMWindow);
            
            function onWindowLoad() {
                window.removeEventListener("load", onWindowLoad);
                if (window.location.href === "chrome://zotero/content/zoteroPane.xul") {
                    WxHtmlCleanerPlugin.addToWindow(window);
                }
            }
            
            window.addEventListener("load", onWindowLoad);
        },
        
        onCloseWindow: function(xulWindow) {},
        onWindowTitleChange: function(xulWindow, newTitle) {}
    },
    
    shutdown: function() {
        // 移除窗口监听器
        Services.wm.removeListener(this.windowListener);
        
        // 从所有窗口移除功能
        var windows = Services.wm.getEnumerator("navigator:browser");
        while (windows.hasMoreElements()) {
            this.removeFromWindow(windows.getNext());
        }
    }
};