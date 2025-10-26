class PeerChat {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.myId = null;
        this.isConnected = false;
        this.targetPeerId = null;

        this.initializeElements();
        this.parseUrlParameters();
        this.initializePeer();
        this.bindEvents();
    }

    initializeElements() {
        this.yourIdInput = document.getElementById('your-id');
        this.connectIdInput = document.getElementById('connect-id');
        this.connectBtn = document.getElementById('connect-btn');
        this.copyBtn = document.getElementById('copy-id');
        this.statusDiv = document.getElementById('status');
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.autoConnectInfo = document.getElementById('auto-connect-info');
        this.manualConnectDiv = document.getElementById('manual-connect');
        this.emptyState = document.getElementById('empty-state');
        this.connectionSection = document.querySelector('.connection-section');
        this.chatSection = document.querySelector('.chat-section');

        // 新功能元素
        this.emojiBtn = document.getElementById('emoji-btn');
        this.fileBtn = document.getElementById('file-btn');
        this.fileInput = document.getElementById('file-input');
        this.emojiPicker = document.getElementById('emoji-picker');
        this.emojiGrid = document.querySelector('.emoji-grid');

        // 初始化表情包
        this.initializeEmojis();

        // 网络状态
        this.isLocalNetwork = false;
        this.networkStatus = null;
        this.networkDiagnostics = document.getElementById('network-diagnostics');

        // 初始时显示连接部分
        this.showConnectionSection();

        // 进行网络诊断
        this.performNetworkDiagnostics();
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.targetPeerId = urlParams.get('connect');

        if (this.targetPeerId) {
            console.log('检测到目标Peer ID:', this.targetPeerId);
        }
    }

    initializeEmojis() {
        // 常用的表情包数据
        this.emojis = [
            '😀', '😂', '😊', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔',
            '😎', '🤩', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
            '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶',
            '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐',
            '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪',
            '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
            '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👈', '👉', '👆', '🖕', '👇',
            '☝️', '👋', '🤚', '🖐', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️',
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
            '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️',
            '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍',
            '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳'
        ];

        this.renderEmojis();
    }

    renderEmojis() {
        if (!this.emojiGrid) return;

        this.emojiGrid.innerHTML = '';
        this.emojis.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';
            emojiItem.textContent = emoji;
            emojiItem.onclick = () => {
                this.insertEmoji(emoji);
            };
            this.emojiGrid.appendChild(emojiItem);
        });
    }

    insertEmoji(emoji) {
        const input = this.messageInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;

        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);

        // 隐藏表情选择器
        this.emojiPicker.style.display = 'none';

        this.showNotification('表情已插入', 'success');
    }

    detectNetworkType() {
        // 网络类型检测
        if (this.connection && this.connection.peer) {
            try {
                // 首先尝试通过IP地址检测
                if (this.connection.peerConnection) {
                    this.connection.peerConnection.getStats().then(stats => {
                        let localIP = null;
                        let remoteIP = null;
                        let isLocalConnection = false;

                        stats.forEach(report => {
                            if (report.type === 'local-candidate') {
                                localIP = report.ip;
                            } else if (report.type === 'remote-candidate') {
                                remoteIP = report.ip;
                            } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                // 检查连接质量
                                if (report.availableOutgoingBitrate > 5000000) { // > 5Mbps
                                    isLocalConnection = true;
                                }
                            }
                        });

                        // 检查IP地址是否在同一网段
                        if (localIP && remoteIP) {
                            isLocalConnection = this.isSameNetwork(localIP, remoteIP);
                        }

                        this.isLocalNetwork = isLocalConnection;
                        this.updateNetworkStatus();

                    }).catch(() => {
                        // 降级到简单检测
                        this.simpleNetworkDetection();
                    });
                } else {
                    this.simpleNetworkDetection();
                }
            } catch (error) {
                console.log('网络检测失败:', error);
                this.simpleNetworkDetection();
            }
        }
    }

    isSameNetwork(ip1, ip2) {
        // 检查两个IP是否在同一网段
        const parts1 = ip1.split('.');
        const parts2 = ip2.split('.');

        if (parts1.length !== 4 || parts2.length !== 4) {
            return false; // IPv6或其他格式
        }

        // 检查前三个字节（C类网络）
        for (let i = 0; i < 3; i++) {
            if (parts1[i] !== parts2[i]) {
                return false;
            }
        }

        return true;
    }

    simpleNetworkDetection() {
        // 简单的网络检测备用方法
        const startTime = Date.now();

        // 发送一个小的ping消息
        if (this.connection) {
            this.connection.send({
                type: 'ping',
                timestamp: startTime
            });

            // 等待pong响应
            const originalReceive = this.receiveMessage.bind(this);
            this.receiveMessage = (data) => {
                if (data.type === 'pong') {
                    const latency = Date.now() - data.timestamp;
                    this.isLocalNetwork = latency < 20; // < 20ms 认为是同网络
                    this.updateNetworkStatus();
                }
                originalReceive(data);
            };

            // 超时检测
            setTimeout(() => {
                if (!this.isLocalNetwork) {
                    this.isLocalNetwork = false;
                    this.updateNetworkStatus();
                }
            }, 1000);
        }
    }

    updateNetworkStatus() {
        const statusDiv = document.getElementById('network-status');

        if (this.isConnected && statusDiv) {
            statusDiv.className = `network-status ${this.isLocalNetwork ? 'local' : 'remote'}`;
            statusDiv.textContent = this.isLocalNetwork ? '🏠 同网络' : '🌐 远程连接';
            statusDiv.title = this.isLocalNetwork ? '快速传输模式' : '标准传输模式';
            statusDiv.style.display = 'block';

            this.showNotification(
                this.isLocalNetwork ? '检测到同网络连接，传输更快！' : '远程连接，传输稳定',
                this.isLocalNetwork ? 'success' : 'info'
            );
        } else if (statusDiv) {
            statusDiv.style.display = 'none';
        }
    }

    initializePeer() {
        try {
            // 创建Peer实例
            this.peer = new Peer({
                config: {
                    'iceServers': [
                        // Google STUN服务器
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        // Mozilla STUN服务器
                        { urls: 'stun:stun.services.mozilla.com:3478' },
                        // Nextcloud STUN服务器
                        { urls: 'stun:stun.nextcloud.com:443' },
                        // Cloudflare STUN服务器
                        { urls: 'stun:stun.cloudflare.com:3478' },
                        // Twilio STUN服务器
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ],
                    'iceCandidatePoolSize': 10,
                    'iceTransportPolicy': 'all'
                },
                debug: 2 // 启用调试信息
            });

            // 当Peer连接到服务器时
            this.peer.on('open', (id) => {
                this.myId = id;
                this.yourIdInput.value = id;
                this.updateStatus('ready');
                console.log('Peer连接成功, ID:', id);

                // 根据是否有目标Peer ID调整UI
                if (this.targetPeerId) {
                    // 有邀请链接，隐藏手动连接，显示自动连接信息
                    this.manualConnectDiv.style.display = 'none';
                    this.autoConnectInfo.style.display = 'block';
                    this.showConnectionSection();
                    this.updateStatus('ready');
                    this.statusDiv.textContent = '准备就绪，尝试自动连接...';

                    // 延迟1秒后自动尝试连接
                    setTimeout(() => {
                        this.connectToPeer(this.targetPeerId);
                    }, 1000);
                } else {
                    // 没有邀请链接，显示手动连接选项
                    this.manualConnectDiv.style.display = 'block';
                    this.autoConnectInfo.style.display = 'none';
                    this.showConnectionSection();
                }

                // 显示测试自动连接链接
                const testLink = document.getElementById('test-auto-connect');
                if (testLink) {
                    testLink.style.display = 'inline';
                }
            });

            // 当有新连接请求时
            this.peer.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            // 连接错误处理
            this.peer.on('error', (err) => {
                console.error('Peer错误:', err);
                this.updateStatus('error');

                let errorMessage = '连接错误: ';
                let suggestions = '';

                switch(err.type) {
                    case 'browser-incompatible':
                        errorMessage += '浏览器不支持WebRTC';
                        suggestions = '请使用Chrome、Firefox、Safari或Edge浏览器的最新版本';
                        break;
                    case 'disconnected':
                        errorMessage += '连接已断开';
                        suggestions = '网络连接不稳定，请检查网络并重试';
                        break;
                    case 'network':
                        errorMessage += '网络错误';
                        suggestions = '1) 检查网络连接 2) 关闭VPN/代理 3) 尝试刷新页面';
                        break;
                    case 'server-error':
                        errorMessage += '服务器错误';
                        suggestions = 'Peer.js服务器暂时不可用，请稍后重试';
                        break;
                    case 'peer-unavailable':
                        errorMessage += '对方不在线或ID不存在';
                        suggestions = '请确认对方在线并检查ID是否正确';
                        break;
                    case 'webrtc':
                        errorMessage += 'WebRTC连接失败';
                        suggestions = '可能是防火墙阻止了连接，建议尝试：1) 关闭VPN 2) 检查企业网络防火墙 3) 尝试同网络连接';
                        break;
                    default:
                        errorMessage += err.message || '未知错误';
                        suggestions = '如果问题持续，请尝试刷新页面或检查网络设置';
                }

                this.showNotification(errorMessage + '\n建议: ' + suggestions, 'error');
            });

        } catch (error) {
            console.error('初始化Peer失败:', error);
            this.updateStatus('error');

            let errorMessage = 'Peer初始化失败';
            let suggestions = '';

            if (error.message.includes('WebRTC')) {
                errorMessage = 'WebRTC不支持';
                suggestions = '请使用Chrome、Firefox、Safari或Edge浏览器的最新版本';
            } else if (error.message.includes('network')) {
                errorMessage = '网络连接失败';
                suggestions = '请检查网络连接，必要时关闭VPN或代理';
            } else {
                errorMessage = '初始化失败';
                suggestions = '请刷新页面重试，如果问题持续，请尝试更换浏览器或网络环境';
            }

            this.showNotification(errorMessage + ': ' + suggestions, 'error');
        }
    }

    handleIncomingConnection(conn) {
        console.log('收到连接请求:', conn.peer);
        this.connection = conn;
        this.setupConnectionHandlers();
        this.updateStatus('connected');
        this.showNotification('已连接到 ' + conn.peer, 'success');
        this.enableChat();

        // 隐藏自动连接信息和连接部分
        if (this.autoConnectInfo) {
            this.autoConnectInfo.style.display = 'none';
        }

        // 检测网络类型
        setTimeout(() => {
            this.detectNetworkType();
        }, 2000);
    }

    connectToPeer(peerId) {
        if (!peerId.trim()) {
            this.showNotification('请输入有效的Peer ID', 'warning');
            return;
        }

        if (peerId === this.myId) {
            this.showNotification('不能连接到自己', 'warning');
            return;
        }

        try {
            this.updateStatus('connecting');
            const conn = this.peer.connect(peerId.trim());

            conn.on('open', () => {
                this.connection = conn;
                this.setupConnectionHandlers();
                this.updateStatus('connected');
                this.showNotification('连接成功!', 'success');
                this.enableChat();

                // 隐藏自动连接信息和连接部分
                this.autoConnectInfo.style.display = 'none';

                // 检测网络类型
                setTimeout(() => {
                    this.detectNetworkType();
                }, 2000);
            });

            conn.on('error', (err) => {
                console.error('连接错误:', err);
                this.updateStatus('disconnected');

                let errorMessage = '自动连接失败';
                let suggestions = '';

                if (err.message.includes('Could not connect')) {
                    errorMessage = '无法连接到对方';
                    suggestions = '可能的原因：1) 对方不在线 2) 网络防火墙阻止 3) ID输入错误';
                } else if (err.message.includes('timeout')) {
                    errorMessage = '连接超时';
                    suggestions = '网络延迟较高，建议：1) 尝试同网络连接 2) 检查网络稳定性 3) 稍后重试';
                } else {
                    errorMessage = err.message || '连接失败';
                    suggestions = '你可以手动输入对方ID连接';
                }

                this.showNotification(errorMessage + ': ' + suggestions, 'error');

                // 显示手动连接选项和连接部分
                this.manualConnectDiv.style.display = 'block';
                this.autoConnectInfo.style.display = 'none';
                this.showConnectionSection();
                this.statusDiv.textContent = '连接失败，可以手动输入对方ID连接';
            });

        } catch (error) {
            console.error('连接失败:', error);
            this.updateStatus('disconnected');

            let errorMessage = '连接失败';
            let suggestions = '';

            if (error.message.includes('Invalid ID')) {
                errorMessage = '无效的Peer ID';
                suggestions = '请检查ID格式是否正确（应该是类似 ba7bf5fd-04be-4c6a-adec-dd0570e155c 这样的格式）';
            } else {
                errorMessage = '连接初始化失败';
                suggestions = '请检查网络连接并重试';
            }

            this.showNotification(errorMessage + ': ' + suggestions, 'error');
        }
    }

    setupConnectionHandlers() {
        this.connection.on('data', (data) => {
            this.receiveMessage(data);
        });

        this.connection.on('close', () => {
            this.connection = null;
            this.isConnected = false;
            this.updateStatus('disconnected');
            this.showNotification('连接已断开', 'warning');
            this.disableChat();
            this.showConnectionSection();
        });

        this.connection.on('error', (err) => {
            console.error('连接错误:', err);
            this.updateStatus('error');
            this.showNotification('连接错误: ' + err.message, 'error');
            this.showConnectionSection();
        });
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!this.connection) return;

        // 如果有消息内容，发送文本消息
        if (message) {
            const timestamp = new Date().toISOString();
            const messageData = {
                type: 'message',
                content: message,
                timestamp: timestamp,
                sender: this.myId
            };

            this.connection.send(messageData);
            this.displayMessage(message, true, timestamp);
            this.messageInput.value = '';
        }

        // 检查是否有待发送的文件
        this.sendPendingFiles();
    }

    sendPendingFiles() {
        if (this.pendingFiles && this.pendingFiles.length > 0) {
            const file = this.pendingFiles.shift();
            this.sendFile(file);
        }
    }

    sendFile(file) {
        if (!this.connection) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                type: 'file',
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                content: e.target.result,
                timestamp: new Date().toISOString(),
                sender: this.myId
            };

            this.connection.send(fileData);
            this.displayFile(file, true);
        };

        reader.readAsDataURL(file);
    }

    receiveMessage(data) {
        if (data.type === 'message') {
            this.displayMessage(data.content, false, data.timestamp);
        } else if (data.type === 'file') {
            this.displayFile(data, false);
        } else if (data.type === 'ping') {
            // 响应pong
            if (this.connection) {
                this.connection.send({
                    type: 'pong',
                    timestamp: data.timestamp
                });
            }
        } else if (data.type === 'pong') {
            // 处理pong响应（已经在simpleNetworkDetection中处理）
            return;
        }
    }

    displayMessage(content, isOwn, timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = isOwn ? '我' : '对方';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.parseMessageContent(content);

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        const messageTime = timestamp ? new Date(timestamp) : new Date();
        timeDiv.textContent = messageTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        this.hideEmptyState();
    }

    parseMessageContent(content) {
        // 将表情符号转换为更大的显示
        return content.replace(/([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/gu,
            '<span style="font-size: 1.5em;">$1</span>');
    }

    displayFile(fileData, isOwn) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = isOwn ? '我' : '对方';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (fileData.fileType && fileData.fileType.startsWith('image/')) {
            // 图片文件
            const img = document.createElement('img');
            img.src = fileData.content;
            img.className = 'image-preview';
            img.onclick = () => {
                this.openImagePreview(fileData.content, fileData.fileName);
            };
            img.onerror = () => {
                // 图片加载失败时显示文件信息
                this.displayFileError(contentDiv, fileData, isOwn);
            };
            contentDiv.appendChild(img);
        } else if (fileData.fileType && (fileData.fileType.startsWith('video/') || fileData.fileType.startsWith('audio/'))) {
            // 视频和音频文件
            const mediaContainer = document.createElement('div');
            mediaContainer.className = 'media-preview';

            const mediaElement = document.createElement(fileData.fileType.startsWith('video/') ? 'video' : 'audio');
            mediaElement.src = fileData.content;
            mediaElement.controls = true;
            mediaElement.style.maxWidth = '100%';
            mediaElement.style.borderRadius = '8px';

            const fileInfo = this.createFileInfo(fileData);
            mediaContainer.appendChild(fileInfo);
            mediaContainer.appendChild(mediaElement);
            contentDiv.appendChild(mediaContainer);
        } else {
            // 其他文件
            const fileInfo = this.createFileInfo(fileData);
            contentDiv.appendChild(fileInfo);
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        this.hideEmptyState();
    }

    createFileInfo(fileData) {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-message';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-info';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.textContent = this.getFileIcon(fileData.fileType);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'file-name';
        nameDiv.textContent = fileData.fileName;
        nameDiv.title = fileData.fileName; // 添加完整文件名提示

        const sizeDiv = document.createElement('div');
        sizeDiv.className = 'file-size';
        sizeDiv.textContent = this.formatFileSize(fileData.fileSize);

        const downloadDiv = document.createElement('a');
        downloadDiv.className = 'file-download';
        downloadDiv.href = fileData.content;
        downloadDiv.download = fileData.fileName;
        downloadDiv.textContent = '下载';
        downloadDiv.onclick = (e) => {
            // 添加下载反馈
            this.showNotification(`正在下载 ${fileData.fileName}`, 'info');
        };

        infoDiv.appendChild(iconDiv);
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(sizeDiv);
        infoDiv.appendChild(downloadDiv);

        fileInfo.appendChild(infoDiv);
        return fileInfo;
    }

    displayFileError(contentDiv, fileData, isOwn) {
        const fileInfo = this.createFileInfo(fileData);
        contentDiv.innerHTML = '';
        contentDiv.appendChild(fileInfo);
    }

    openImagePreview(imageSrc, fileName) {
        // 创建全屏图片预览模态框
        const modal = document.createElement('div');
        modal.className = 'image-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'image-modal-content';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'image-modal-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };

        const img = document.createElement('img');
        img.src = imageSrc;
        img.className = 'image-modal-preview';
        img.onerror = () => {
            this.showNotification('图片加载失败', 'error');
            document.body.removeChild(modal);
        };

        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'image-modal-download';
        downloadBtn.href = imageSrc;
        downloadBtn.download = fileName;
        downloadBtn.textContent = '下载原图';

        modalContent.appendChild(closeBtn);
        modalContent.appendChild(img);
        modalContent.appendChild(downloadBtn);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 点击模态框背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('document') || fileType.includes('word')) return '📝';
        if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
        if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
        return '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateStatus(status) {
        this.statusDiv.className = status;
        this.isConnected = status === 'connected';

        switch (status) {
            case 'ready':
                this.statusDiv.textContent = '就绪';
                this.statusDiv.className = 'ready';
                break;
            case 'connecting':
                this.statusDiv.textContent = '连接中...';
                this.statusDiv.className = 'connecting';
                break;
            case 'connected':
                this.statusDiv.textContent = `已连接`;
                this.statusDiv.className = 'connected';
                break;
            case 'disconnected':
                this.statusDiv.textContent = '未连接';
                this.statusDiv.className = 'disconnected';
                break;
            case 'error':
                this.statusDiv.textContent = '连接失败';
                this.statusDiv.className = 'disconnected';
                break;
        }
    }

    enableChat() {
        this.messageInput.disabled = false;
        this.sendBtn.disabled = false;
        if (this.emojiBtn) this.emojiBtn.disabled = false;
        if (this.fileBtn) this.fileBtn.disabled = false;
        this.messageInput.focus();
        this.hideEmptyState();
        this.hideConnectionSection();
    }

    disableChat() {
        this.messageInput.disabled = true;
        this.sendBtn.disabled = true;
        if (this.emojiBtn) this.emojiBtn.disabled = true;
        if (this.fileBtn) this.fileBtn.disabled = true;
        this.showEmptyState();
        this.showConnectionSection();
    }

    hideConnectionSection() {
        if (this.connectionSection) {
            this.connectionSection.style.opacity = '0';
            this.connectionSection.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                this.connectionSection.style.display = 'none';
                this.adjustChatSection();
            }, 300);
        }
    }

    showConnectionSection() {
        if (this.connectionSection) {
            this.connectionSection.style.display = 'block';
            // 强制重排，确保动画生效
            this.connectionSection.offsetHeight;
            this.connectionSection.style.opacity = '1';
            this.connectionSection.style.transform = 'translateY(0)';
            this.adjustChatSection();
        }
    }

    adjustChatSection() {
        if (this.chatSection) {
            // 强制重排，让flex重新计算
            this.chatSection.style.height = 'auto';
            setTimeout(() => {
                this.chatSection.style.height = '';
            }, 10);
        }
    }

    performNetworkDiagnostics() {
        console.log('开始网络诊断...');

        let issuesFound = [];

        // 检查WebRTC支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('浏览器不支持WebRTC');
            issuesFound.push('WebRTC不支持');
            this.showNotification('您的浏览器不支持WebRTC，可能无法进行P2P连接', 'warning');
        }

        // 检查网络连接
        if (!navigator.onLine) {
            console.warn('网络连接不可用');
            issuesFound.push('网络离线');
            this.showNotification('网络连接不可用，请检查网络设置', 'error');
        }

        // 测试STUN服务器连接
        this.testStunServers();

        // 检测防火墙限制
        this.checkFirewallRestrictions();

        // 显示网络诊断指示器
        if (issuesFound.length > 0) {
            this.showNetworkDiagnostics('网络问题: ' + issuesFound.join(', '), 'warning');
        } else {
            this.showNetworkDiagnostics('网络正常', 'success');
        }
    }

    testStunServers() {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun.services.mozilla.com:3478' }
            ]
        });

        let stunWorks = false;

        pc.onicecandidate = (event) => {
            if (event.candidate && event.candidate.candidate.includes('typ srflx')) {
                stunWorks = true;
                console.log('STUN服务器工作正常');
            }
        };

        // 创建数据通道来触发ICE收集
        pc.createDataChannel('test');

        setTimeout(() => {
            if (!stunWorks) {
                console.warn('STUN服务器可能有问题');
                this.showNotification('检测到网络可能阻止WebRTC连接，建议尝试以下解决方案：1) 关闭VPN 2) 检查防火墙设置 3) 尝试使用同网络连接', 'warning');
                this.showNetworkDiagnostics('STUN连接失败', 'error');
            } else {
                this.showNetworkDiagnostics('STUN连接正常', 'success');
            }
            pc.close();
        }, 3000);
    }

    checkFirewallRestrictions() {
        // 检测常见端口是否被阻止
        const portsToCheck = [19302, 443, 3478];
        let blockedPorts = [];

        portsToCheck.forEach(port => {
            const img = new Image();
            img.onload = () => console.log(`端口 ${port} 可用`);
            img.onerror = () => {
                console.warn(`端口 ${port} 可能被阻止`);
                blockedPorts.push(port);
            };
            img.src = `https://httpbin.org/status/${port}`;
        });

        setTimeout(() => {
            if (blockedPorts.length > 0) {
                console.warn('检测到可能的端口限制:', blockedPorts);
            }
        }, 2000);
    }

    showNetworkDiagnostics(message, type = 'info') {
        if (this.networkDiagnostics) {
            this.networkDiagnostics.textContent = message;
            this.networkDiagnostics.className = `network-diagnostics ${type}`;
            this.networkDiagnostics.style.display = 'block';

            // 点击时显示详细诊断信息
            this.networkDiagnostics.onclick = () => {
                this.showDetailedDiagnostics();
            };

            // 5秒后自动隐藏
            setTimeout(() => {
                if (this.networkDiagnostics) {
                    this.networkDiagnostics.style.display = 'none';
                }
            }, 5000);
        }
    }

    showDetailedDiagnostics() {
        let diagnosticInfo = '网络诊断详情:\n\n';

        diagnosticInfo += '浏览器: ' + navigator.userAgent + '\n';
        diagnosticInfo += '在线状态: ' + (navigator.onLine ? '在线' : '离线') + '\n';
        diagnosticInfo += 'WebRTC支持: ' + (navigator.mediaDevices ? '支持' : '不支持') + '\n';
        diagnosticInfo += '当前时间: ' + new Date().toLocaleString() + '\n';
        diagnosticInfo += 'UserAgent: ' + navigator.userAgent + '\n';

        this.showNotification(diagnosticInfo, 'info');
    }

    showEmptyState() {
        if (this.emptyState) {
            // 只有在没有消息时才显示空状态
            const hasMessages = this.chatMessages.children.length > 1 || this.chatMessages.querySelector('.message');
            if (!hasMessages) {
                this.emptyState.style.display = 'flex';
            }
        }
    }

    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
    }

    toggleEmojiPicker() {
        if (this.emojiPicker.style.display === 'block') {
            this.emojiPicker.style.display = 'none';
        } else {
            this.emojiPicker.style.display = 'block';

            // 定位表情选择器（相对于fixed输入框）
            const inputRect = this.messageInput.getBoundingClientRect();
            const containerRect = this.messageInput.parentElement.getBoundingClientRect();

            this.emojiPicker.style.bottom = (window.innerHeight - inputRect.top + 10) + 'px';
            this.emojiPicker.style.left = Math.max(10, inputRect.left - containerRect.left + 10) + 'px';
            this.emojiPicker.style.right = Math.max(10, containerRect.right - inputRect.right + 10) + 'px';
        }
    }

    handleFileSelection(files) {
        if (!files || files.length === 0) return;

        // 初始化待发送文件队列
        if (!this.pendingFiles) {
            this.pendingFiles = [];
        }

        // 添加文件到队列
        for (let file of files) {
            // 检查文件大小 (限制为50MB)
            if (file.size > 50 * 1024 * 1024) {
                this.showNotification(`文件 ${file.name} 过大，最大支持50MB`, 'warning');
                continue;
            }

            this.pendingFiles.push(file);
        }

        if (this.pendingFiles.length > 0) {
            this.showNotification(`已选择 ${this.pendingFiles.length} 个文件`, 'success');

            // 如果消息框为空，自动发送文件
            if (!this.messageInput.value.trim()) {
                this.sendMessage();
            }
        }

        // 清空文件输入
        this.fileInput.value = '';
    }

    copyId() {
        if (this.myId) {
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('connect', this.myId);
            const inviteUrl = currentUrl.toString();

            navigator.clipboard.writeText(inviteUrl).then(() => {
                this.showNotification('链接已复制，发送给朋友即可自动连接', 'success');

                // 临时改变按钮文字
                const originalText = this.copyBtn.textContent;
                this.copyBtn.textContent = '已复制';
                setTimeout(() => {
                    this.copyBtn.textContent = originalText;
                }, 2000);
            }).catch(() => {
                // 兼容性处理
                const textArea = document.createElement('textarea');
                textArea.value = inviteUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('链接已复制，发送给朋友即可自动连接', 'success');
            });
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // 添加样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '1000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // 根据类型设置背景色
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #dc3545, #fd7e14)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #007bff, #6610f2)';
        }

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);

        // 自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    bindEvents() {
        // 连接按钮
        this.connectBtn.addEventListener('click', () => {
            this.connectToPeer(this.connectIdInput.value);
        });

        // 复制ID按钮
        this.copyBtn.addEventListener('click', () => {
            this.copyId();
        });

        // 发送消息按钮
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // 回车发送消息
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 连接ID输入框回车连接
        this.connectIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.connectToPeer(this.connectIdInput.value);
            }
        });

        // 自动调整消息输入框高度
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            const maxHeight = 100;
            const scrollHeight = this.messageInput.scrollHeight;
            this.messageInput.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        });

        // 表情包按钮
        if (this.emojiBtn) {
            this.emojiBtn.addEventListener('click', () => {
                this.toggleEmojiPicker();
            });
        }

        // 文件选择按钮
        if (this.fileBtn) {
            this.fileBtn.addEventListener('click', () => {
                this.fileInput.click();
            });
        }

        // 文件选择事件
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }

        // 点击外部关闭表情选择器
        document.addEventListener('click', (e) => {
            if (this.emojiPicker && !this.emojiPicker.contains(e.target) &&
                !this.emojiBtn.contains(e.target)) {
                this.emojiPicker.style.display = 'none';
            }
        });

        // 文件拖拽功能
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const chatSection = document.querySelector('.chat-section');

        // 拖拽进入
        chatSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.isConnected) {
                chatSection.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
            }
        });

        // 拖拽离开
        chatSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            chatSection.style.backgroundColor = '';
        });

        // 拖拽放下
        chatSection.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            chatSection.style.backgroundColor = '';

            if (!this.isConnected) {
                this.showNotification('请先连接再发送文件', 'warning');
                return;
            }

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFileSelection(files);
            }
        });

        // 拖拽开始时显示提示
        chatSection.addEventListener('dragenter', (e) => {
            if (this.isConnected && e.dataTransfer.types.includes('Files')) {
                this.showNotification('松开鼠标发送文件', 'info');
            }
        });
    }

}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.peerChat = new PeerChat();

    // 全局测试自动连接函数
    window.testAutoConnect = function() {
        if (window.peerChat && window.peerChat.myId) {
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('connect', window.peerChat.myId);
            const testUrl = currentUrl.toString();

            // 在新窗口中打开测试链接
            window.open(testUrl, '_blank');

            window.peerChat.showNotification('测试窗口已打开', 'success');
        } else {
            alert('请等待Peer ID生成完成');
        }
    };
});

// 添加一些CSS样式用于通知
const style = document.createElement('style');
style.textContent = `
    .notification {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .ready {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        border-color: #3b82f6;
    }
`;
document.head.appendChild(style);
