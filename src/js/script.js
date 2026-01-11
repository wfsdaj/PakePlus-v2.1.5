// 全局变量
let currentDate = new Date();
let selectedDate = new Date();
let currentTaskDate = null;
let currentTaskTab = 'pending';
let lastClickDate = null;
let lastClickTime = null;

// 页面加载时初始化
window.onload = async function() {
    await initCalendar();
    await initEventListeners();
};

// 初始化日历
async function initCalendar() {
    await renderCalendar();
    updateFooterInfo();
}

// 更新底部信息
function updateFooterInfo() {
    const lunarDate = Lunar.fromDate(selectedDate);
    const today = new Date();
    
    // 格式化农历信息
    const yearGanZhi = lunarDate.getYearInGanZhi(); // 干支纪年
    const yearZodiac = lunarDate.getShengxiao(); // 生肖
    const lunarMonth = lunarDate.getMonthInChinese();
    const lunarDay = lunarDate.getDayInChinese();
    const monthValue = lunarDate.getMonth();
    const isLeapMonth = monthValue < 0;
    
    let lunarInfo = `${yearGanZhi}${yearZodiac}年`;
    if (isLeapMonth) {
        lunarInfo += `闰${lunarMonth}月${lunarDay}`;
    } else {
        lunarInfo += `${lunarMonth}月${lunarDay}`;
    }
    
    document.getElementById('lunarInfo').textContent = lunarInfo;
    
    // 计算距离今天的天数
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const daysCountEl = document.getElementById('daysCount');
    if (diffDays === 0) {
        daysCountEl.textContent = '今天';
        daysCountEl.className = 'days-count zero';
    } else if (diffDays > 0) {
        daysCountEl.textContent = `${diffDays}天后`;
        daysCountEl.className = 'days-count positive';
    } else {
        daysCountEl.textContent = `${Math.abs(diffDays)}天前`;
        daysCountEl.className = 'days-count negative';
    }
}

// 渲染日历
async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 更新月份标题
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                      '七月', '八月', '九月', '十月', '十一月', '十二月'];
    document.getElementById('monthYear').textContent = `${year}年 ${monthNames[month]}`;
    
    // 获取当月的第一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取第一天是星期几 (0-6)，转换为周一为起始
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    
    // 获取总天数
    const daysInMonth = lastDay.getDate();
    
    // 获取上月的最后几天
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    // 获取今天的日期
    const today = new Date();
    
    // 清空日历网格
    const daysGrid = document.getElementById('daysGrid');
    daysGrid.innerHTML = '';
    
    // 添加上月的日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 1, day);
        addDayElement(daysGrid, date, true);
    }
    
    // 添加当月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        addDayElement(daysGrid, date, false);
    }
    
    // 添加下月的日期
    const totalCells = firstDayOfWeek + daysInMonth;
    const remainingCells = 42 - totalCells; // 确保6行7列
    
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        addDayElement(daysGrid, date, true);
    }
    
    // 更新任务指示点
    await updateTaskIndicators();
}

// 添加日期元素
function addDayElement(container, date, isOtherMonth) {
    const day = date.getDate();
    const dayElement = document.createElement('div');
    dayElement.className = 'day';
    dayElement.dataset.date = date.toDateString();
    
    // 判断是否为周末
    if (date.getDay() === 0 || date.getDay() === 6) {
        dayElement.classList.add('weekend');
    }
    
    // 判断是否为今天
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }
    
    // 判断是否为选中的日期
    if (date.toDateString() === selectedDate.toDateString()) {
        dayElement.classList.add('selected');
    }
    
    // 判断是否为其他月份
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // 获取农历信息
    const lunarDate = Lunar.fromDate(date);
    const lunarDay = lunarDate.getDayInChinese();
    
    // 添加日期内容
    const solarDaySpan = document.createElement('span');
    solarDaySpan.className = 'solar-day';
    solarDaySpan.textContent = day;
    
    const lunarDaySpan = document.createElement('span');
    lunarDaySpan.className = 'lunar-day';
    
    // 获取农历节日
    const lunarFestivalName = getLunarFestivalName(lunarDate);

    // 检查固定日期假期/调休
    const holidayInfo = getHolidayInfo(date);

    // 显示节假日名称或农历日期（始终显示农历日期）
    if (lunarFestivalName) {
        // 农历节日只在底部农历信息中显示
    }
    lunarDaySpan.textContent = lunarDay;

    // 添加休/班标记
    if (holidayInfo && holidayInfo.type) {
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `day-badge ${holidayInfo.type}`;
        badgeSpan.textContent = holidayInfo.type === 'rest' ? '休' : '班';
        dayElement.appendChild(badgeSpan);
    }
    
    dayElement.appendChild(solarDaySpan);
    dayElement.appendChild(lunarDaySpan);
    
    // 绑定点击事件
    dayElement.addEventListener('click', function() {
        handleDayClick(date);
    });
    
    container.appendChild(dayElement);
}

// 统一的点击处理函数
async function handleDayClick(date) {
    const now = Date.now();
    const dateStr = date.toDateString();
    
    if (lastClickDate === dateStr && lastClickTime && (now - lastClickTime) < 300) {
        // 双击
        openTaskModal(date);
        // 重置
        lastClickDate = null;
        lastClickTime = null;
    } else {
        // 单击
        lastClickDate = dateStr;
        lastClickTime = now;
        
        selectedDate = date;
        await renderCalendar();
        updateFooterInfo();
        await renderTaskList();
    }
}

// 更新所有日期的任务指示点
async function updateTaskIndicators() {
    const daysGrid = document.getElementById('daysGrid');
    const dayElements = daysGrid.querySelectorAll('.day');
    
    for (const dayElement of dayElements) {
        if (dayElement.dataset.date) {
            const date = new Date(dayElement.dataset.date);
            const hasTasks = await dateHasTasks(date);
            if (hasTasks) {
                dayElement.classList.add('has-task');
            } else {
                dayElement.classList.remove('has-task');
            }
        }
    }
}

// 获取农历节日名称
function getLunarFestivalName(lunarDate) {
    // 使用 lunar-javascript 库的 getFestivals 方法获取节日列表
    const festivals = lunarDate.getFestivals();
    if (festivals && festivals.length > 0) {
        return festivals[0];
    }

    // 传统农历节日（备用匹配）
    const lunarFestivals = {
        '正月初一': '春节',
        '正月十五': '元宵节',
        '二月初二': '龙抬头',
        '五月初五': '端午节',
        '七月初七': '七夕节',
        '八月十五': '中秋节',
        '九月初九': '重阳节',
        '腊月初八': '腊八节',
        '腊月廿三': '小年',
        '腊月三十': '除夕'
    };

    const month = lunarDate.getMonth();
    const day = lunarDate.getDay();
    const isLeapMonth = month < 0; // 负数表示闰月，闰月不显示传统节日

    if (isLeapMonth) {
        return null;
    }

    const monthName = lunarDate.getMonthInChinese();
    const dayName = lunarDate.getDayInChinese();
    const festivalKey = `${monthName}${dayName}`;

    return lunarFestivals[festivalKey] || null;
}

// 获取假期信息：返回 {type}，type='rest'=休息日，'work'=调休日，null=普通日
function getHolidayInfo(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay();

    // 2026年节假日安排
    if (year === 2026) {
        // 元旦：1月1日-3日休息，1月4日（周日）调休上班
        if (month === 1 && day >= 1 && day <= 3) {
            return { type: 'rest' };
        }
        if (month === 1 && day === 4) {
            return { type: 'work' };
        }
        // 春节假期：2月15日-23日休息
        if (month === 2 && day >= 15 && day <= 23) {
            return { type: 'rest' };
        }
        // 调休：2月14日（除夕前一天，周六）上班
        if (month === 2 && day === 14) {
            return { type: 'work' };
        }
        // 调休：2月28日（周六）上班
        if (month === 2 && day === 28) {
            return { type: 'work' };
        }
        // 清明节：4月4日-6日休息
        if (month === 4 && day >= 4 && day <= 6) {
            return { type: 'rest' };
        }
        // 劳动节：5月1日-5日休息，5月9日（周六）调休上班
        if (month === 5 && day >= 1 && day <= 5) {
            return { type: 'rest' };
        }
        if (month === 5 && day === 9) {
            return { type: 'work' };
        }
        // 端午节：6月19日-21日休息
        if (month === 6 && day >= 19 && day <= 21) {
            return { type: 'rest' };
        }
        // 中秋节+国庆节：10月1日-8日休息
        if (month === 10 && day >= 1 && day <= 8) {
            return { type: 'rest' };
        }
        // 国庆节调休：10月10日（周五）上班
        if (month === 10 && day === 10) {
            return { type: 'work' };
        }
    }

    return null;
}

// 切换月份
async function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    await renderCalendar();
}

// 跳转到今天
async function goToToday() {
    currentDate = new Date();
    selectedDate = new Date();
    await renderCalendar();
    updateFooterInfo();
}

// ========== 待办事项功能 ==========

// 初始化事件监听器
function initEventListeners() {
    // 回车键保存任务
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveTask();
        }
    });
    
    // 点击弹窗外部关闭
    document.getElementById('taskModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeTaskModal();
        }
    });
}

// 打开添加待办事项弹窗
function openTaskModal(date) {
    currentTaskDate = date;
    const modal = document.getElementById('taskModal');
    const header = document.getElementById('modalHeader');
    const input = document.getElementById('taskInput');
    
    header.textContent = `添加待办事项 - ${formatDateForDisplay(date)}`;
    input.value = '';
    input.focus();
    
    modal.classList.add('active');
}

// 关闭弹窗
function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    currentTaskDate = null;
}

// 保存待办事项
async function saveTask() {
    if (!currentTaskDate) return;
    
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    
    if (!text) {
        alert('请输入待办事项内容');
        return;
    }
    
    await addTask(currentTaskDate, text);
    closeTaskModal();
    await renderCalendar();
    await renderTaskList();
}

// 切换任务选项卡
async function switchTaskTab(tab) {
    currentTaskTab = tab;
    
    // 更新选项卡样式
    document.getElementById('tabPending').classList.toggle('active', tab === 'pending');
    document.getElementById('tabCompleted').classList.toggle('active', tab === 'completed');
    
    // 重新渲染任务列表
    await renderTaskList();
}

// 渲染任务列表
async function renderTaskList() {
    const taskPanel = document.getElementById('taskPanel');
    const taskHeader = document.getElementById('taskHeader');
    const tasks = await getTasksForDate(selectedDate);

    if (tasks.length > 0) {
        taskPanel.classList.add('active');
    } else {
        taskPanel.classList.remove('active');
    }

    // 更新任务面板标题
    if (currentTaskTab === 'pending') {
        taskHeader.textContent = `${formatDateForDisplay(selectedDate)} 的待办事项`;
    } else {
        taskHeader.textContent = `${formatDateForDisplay(selectedDate)} 已完成`;
    }

    // 渲染任务列表
    const taskList = document.getElementById('taskList');
    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    
    // 更新计数
    document.getElementById('pendingCount').textContent = `(${pendingTasks.length})`;
    document.getElementById('completedCount').textContent = `(${completedTasks.length})`;
    
    // 根据当前选项卡显示
    if (currentTaskTab === 'pending') {
        if (pendingTasks.length === 0) {
            taskList.innerHTML = '<div class="task-empty">暂无待办事项</div>';
        } else {
            taskList.innerHTML = pendingTasks.map(task => `
                <div class="task-item">
                    <input type="checkbox" class="task-checkbox" onchange="toggleTaskComplete(${task.id})">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    <button class="task-delete" onclick="confirmDeleteTask(${task.id})" title="删除">×</button>
                </div>
            `).join('');
        }
    } else {
        if (completedTasks.length === 0) {
            taskList.innerHTML = '<div class="task-empty">暂无已完成事项</div>';
        } else {
            taskList.innerHTML = completedTasks.map(task => `
                <div class="task-item">
                    <input type="checkbox" class="task-checkbox" checked onchange="toggleTaskComplete(${task.id})">
                    <span class="task-text completed">${escapeHtml(task.text)}</span>
                    <button class="task-delete" onclick="confirmDeleteTask(${task.id})" title="删除">×</button>
                </div>
            `).join('');
        }
    }
}

// 获取指定日期的待办事项
async function getTasksForDate(date) {
    const dateStr = date.toDateString();
    const allTasks = await getAllTasks();
    return allTasks[dateStr] || [];
}

// 获取所有待办事项（使用 Tauri 文件存储，回退到 localStorage）
async function getAllTasks() {
    // 尝试使用 Tauri 文件存储
    if (window.__TAURI__ && window.__TAURI__.fs) {
        try {
            const tasks = await window.__TAURI__.fs.readTextFile('tasks.json');
            return JSON.parse(tasks);
        } catch (e) {
            // 文件不存在或读取失败，使用空对象
            console.warn('Tauri 文件读取失败，使用 localStorage:', e.message);
        }
    }
    
    // 回退到 localStorage
    try {
        const tasks = localStorage.getItem('calendarApp_tasks');
        return tasks ? JSON.parse(tasks) : {};
    } catch (e) {
        console.warn('localStorage访问失败:', e);
        return {};
    }
}

// 保存所有待办事项（使用 Tauri 文件存储，回退到 localStorage）
async function saveAllTasks(tasks) {
    // 尝试使用 Tauri 文件存储
    if (window.__TAURI__ && window.__TAURI__.fs) {
        try {
            await window.__TAURI__.fs.writeTextFile(JSON.stringify(tasks, null, 2), 'tasks.json');
            return;
        } catch (e) {
            console.warn('Tauri 文件保存失败，使用 localStorage:', e.message);
        }
    }
    
    // 回退到 localStorage
    try {
        localStorage.setItem('calendarApp_tasks', JSON.stringify(tasks));
    } catch (e) {
        console.warn('localStorage保存失败:', e);
        alert('保存失败，请检查存储权限');
    }
}
// 添加待办事项
async function addTask(date, text) {
    const dateStr = date.toDateString();
    const allTasks = await getAllTasks();
    
    if (!allTasks[dateStr]) {
        allTasks[dateStr] = [];
    }
    
    const task = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    allTasks[dateStr].push(task);
    await saveAllTasks(allTasks);
    return task;
}

// 删除待办事项
async function deleteTask(date, taskId) {
    const dateStr = date.toDateString();
    const allTasks = await getAllTasks();
    
    if (allTasks[dateStr]) {
        allTasks[dateStr] = allTasks[dateStr].filter(task => task.id !== taskId);
        
        // 如果该日期没有待办事项了，删除该日期的记录
        if (allTasks[dateStr].length === 0) {
            delete allTasks[dateStr];
        }
        
        await saveAllTasks(allTasks);
    }
}

// 切换任务完成状态
async function toggleTaskComplete(taskId) {
    const dateStr = selectedDate.toDateString();
    const allTasks = await getAllTasks();
    
    if (allTasks[dateStr]) {
        const task = allTasks[dateStr].find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            await saveAllTasks(allTasks);
            await renderTaskList();
            
            // 如果切换后当前选项卡没有内容，切换到有内容的选项卡
            const tasks = allTasks[dateStr];
            const pendingCount = tasks.filter(t => !t.completed).length;
            const completedCount = tasks.filter(t => t.completed).length;
            
            if (currentTaskTab === 'pending' && pendingCount === 0 && completedCount > 0) {
                await switchTaskTab('completed');
            } else if (currentTaskTab === 'completed' && completedCount === 0 && pendingCount > 0) {
                await switchTaskTab('pending');
            }
        }
    }
}

async function confirmDeleteTask(taskId) {
    if (confirm('确定要删除这个事项吗？')) {
        await deleteTask(selectedDate, taskId);
        await renderCalendar();
        await renderTaskList();
    }
}

// 检查日期是否有待办事项（未完成）
async function dateHasTasks(date) {
    const tasks = await getTasksForDate(date);
    return tasks.some(t => !t.completed);
}

// 格式化日期显示
function formatDateForDisplay(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    return `${month}月${day}日 ${weekDay}`;
}

// HTML转义防止XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}