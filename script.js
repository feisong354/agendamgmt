// 任务管理应用
class TaskManager {
    constructor() {
        this.tasks = [];
        this.history = [];
        this.currentFilter = 'all';
        this.init();
    }

    // 初始化应用
    init() {
        this.loadData();
        this.bindEvents();
        this.updateTaskStatuses();
        this.renderTasks();
        this.renderHistory();
        
        // 每分钟检查一次任务状态
        setInterval(() => {
            this.updateTaskStatuses();
            this.renderTasks();
        }, 60000);
    }

    // 绑定事件
    bindEvents() {
        // 表单提交事件
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // 筛选按钮事件
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
    }

    // 添加任务
    addTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const deadline = document.getElementById('taskDeadline').value;

        if (!title || !deadline) {
            alert('请填写任务标题和截止时间');
            return;
        }

        const task = {
            id: Date.now().toString(),
            title,
            description,
            deadline: new Date(deadline),
            status: 'in-progress',
            createdAt: new Date(),
            completedAt: null
        };

        this.tasks.push(task);
        this.saveData();
        this.renderTasks();
        this.clearForm();
        
        // 显示成功消息
        this.showMessage('任务添加成功！', 'success');
    }

    // 更新任务状态
    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const oldStatus = task.status;
            task.status = newStatus;
            
            if (newStatus === 'completed') {
                task.completedAt = new Date();
            } else {
                task.completedAt = null;
            }

            this.saveData();
            this.renderTasks();
            
            // 显示状态更新消息
            this.showMessage(`任务状态已更新为：${this.getStatusText(newStatus)}`, 'info');
        }
    }

    // 删除任务
    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = this.tasks[taskIndex];
            
            // 将任务移到历史记录
            this.history.push({
                ...task,
                deletedAt: new Date()
            });
            
            // 从当前任务中移除
            this.tasks.splice(taskIndex, 1);
            
            this.saveData();
            this.renderTasks();
            this.renderHistory();
            
            this.showMessage('任务已删除', 'info');
        }
    }

    // 自动更新任务状态（检查超时）
    updateTaskStatuses() {
        const now = new Date();
        let hasChanges = false;

        this.tasks.forEach(task => {
            if (task.status === 'in-progress' && task.deadline < now) {
                task.status = 'overdue';
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveData();
        }
    }

    // 设置筛选器
    setFilter(filter) {
        this.currentFilter = filter;
        
        // 更新按钮状态
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTasks();
    }

    // 渲染任务列表
    renderTasks() {
        const taskList = document.getElementById('taskList');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            taskList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        taskList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
    }

    // 渲染历史任务
    renderHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <h3>暂无历史任务</h3>
                    <p>删除的任务将显示在这里</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.history
            .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
            .map(task => this.createHistoryHTML(task))
            .join('');
    }

    // 获取筛选后的任务
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'in-progress':
                return this.tasks.filter(task => task.status === 'in-progress');
            case 'completed':
                return this.tasks.filter(task => task.status === 'completed');
            case 'overdue':
                return this.tasks.filter(task => task.status === 'overdue');
            default:
                return this.tasks;
        }
    }

    // 创建任务HTML
    createTaskHTML(task) {
        const isOverdue = task.status === 'overdue';
        const deadlineText = this.formatDateTime(task.deadline);
        const statusText = this.getStatusText(task.status);
        
        return `
            <div class="task-item ${task.status}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-status status-${task.status}">${statusText}</div>
                    </div>
                </div>
                
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                
                <div class="task-meta">
                    <div class="task-deadline ${isOverdue ? 'overdue' : ''}">
                        📅 截止时间：${deadlineText}
                    </div>
                    <div class="task-actions">
                        ${task.status !== 'completed' ? 
                            `<button class="btn btn-success" onclick="taskManager.updateTaskStatus('${task.id}', 'completed')">
                                完成
                            </button>` : 
                            `<button class="btn btn-secondary" onclick="taskManager.updateTaskStatus('${task.id}', 'in-progress')">
                                重新开始
                            </button>`
                        }
                        <button class="btn btn-danger" onclick="taskManager.deleteTask('${task.id}')">
                            删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 创建历史任务HTML
    createHistoryHTML(task) {
        const deletedAt = this.formatDateTime(task.deletedAt);
        const statusText = this.getStatusText(task.status);
        
        return `
            <div class="history-item">
                <div class="task-header">
                    <div>
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-status status-${task.status}">${statusText}</div>
                    </div>
                </div>
                
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                
                <div class="task-meta">
                    <div class="task-deadline">
                        📅 原截止时间：${this.formatDateTime(task.deadline)}
                    </div>
                    <div class="task-deadline">
                        🗑️ 删除时间：${deletedAt}
                    </div>
                </div>
            </div>
        `;
    }

    // 获取空状态HTML
    getEmptyStateHTML() {
        const messages = {
            all: { title: '暂无任务', desc: '点击上方按钮添加你的第一个任务' },
            'in-progress': { title: '暂无进行中的任务', desc: '所有任务都已完成或超时' },
            completed: { title: '暂无已完成的任务', desc: '完成一些任务后它们会显示在这里' },
            overdue: { title: '暂无超时任务', desc: '很好！所有任务都在按时进行' }
        };
        
        const message = messages[this.currentFilter];
        
        return `
            <div class="empty-state">
                <h3>${message.title}</h3>
                <p>${message.desc}</p>
            </div>
        `;
    }

    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'in-progress': '进行中',
            'completed': '已完成',
            'overdue': '已超时'
        };
        return statusMap[status] || status;
    }

    // 格式化日期时间
    formatDateTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = d - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        const dateStr = d.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        const timeStr = d.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let relativeTime = '';
        if (days > 0) {
            relativeTime = ` (还有${days}天)`;
        } else if (days === 0) {
            relativeTime = ' (今天)';
        } else {
            relativeTime = ` (已超时${Math.abs(days)}天)`;
        }
        
        return `${dateStr} ${timeStr}${relativeTime}`;
    }

    // 清空表单
    clearForm() {
        document.getElementById('taskForm').reset();
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        
        // 设置背景颜色
        const colors = {
            success: '#48bb78',
            error: '#f56565',
            info: '#667eea',
            warning: '#ed8936'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(messageEl);
        
        // 3秒后自动移除
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 保存数据到本地存储
    saveData() {
        localStorage.setItem('taskManager_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('taskManager_history', JSON.stringify(this.history));
    }

    // 从本地存储加载数据
    loadData() {
        try {
            const tasksData = localStorage.getItem('taskManager_tasks');
            const historyData = localStorage.getItem('taskManager_history');
            
            if (tasksData) {
                this.tasks = JSON.parse(tasksData).map(task => ({
                    ...task,
                    deadline: new Date(task.deadline),
                    createdAt: new Date(task.createdAt),
                    completedAt: task.completedAt ? new Date(task.completedAt) : null
                }));
            }
            
            if (historyData) {
                this.history = JSON.parse(historyData).map(task => ({
                    ...task,
                    deadline: new Date(task.deadline),
                    createdAt: new Date(task.createdAt),
                    completedAt: task.completedAt ? new Date(task.completedAt) : null,
                    deletedAt: new Date(task.deletedAt)
                }));
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.tasks = [];
            this.history = [];
        }
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 初始化应用
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
    
    // 设置默认截止时间为明天
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0); // 设置为明天下午6点
    
    const deadlineInput = document.getElementById('taskDeadline');
    deadlineInput.value = tomorrow.toISOString().slice(0, 16);
});
