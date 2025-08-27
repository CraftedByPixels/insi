// Application state
let participants = [];
let weightEntries = [];
let challengeSettings = {
    challengeStartDate: '2025-08-25', // Начало периода регистрации
    challengeEndDate: '2025-09-07',   // Конец периода регистрации
    duration: 14,                     // Длительность челленджа для каждого участника
    currency: '₽'
};

// Отладочная информация при загрузке
console.log('=== APP.JS LOADED ===');
console.log('Current time:', new Date().toLocaleString());

// Charts
let groupProgressChart = null;
let groupWeightChart = null;
let individualProgressChart = null;
let allParticipantsChart = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...'); // Отладка
    initializeApp();
    setupEventListeners();
    updateDateInput();
    
    // Убеждаемся, что дашборд активен по умолчанию
    console.log('Setting default active tab...'); // Отладка
    setTimeout(() => {
        console.log('Calling switchTab dashboard...'); // Отладка
        switchTab('dashboard');
        console.log('Dashboard tab should be active now'); // Отладка
    }, 200); // Увеличиваем задержку
});

function initializeApp() {
    console.log('=== initializeApp called ==='); // Отладка
    
    // Проверяем, что все необходимые элементы существуют
    const requiredElements = [
        'dashboard', 'participants', 'weight-entry',
        'participantsList', 'weightEntryList'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`Element ${id}:`, element ? 'found' : 'NOT FOUND!'); // Отладка
    });
    
    loadData();
    // Применяем тему перед рендерингом
    const savedTheme = localStorage.getItem('selectedTheme') || 'light';
    setTheme(savedTheme);
    
    // НЕ вызываем рендеринг здесь - это будет сделано в switchTab
    updateChallengeInfo();
    
    console.log('=== initializeApp completed ==='); // Отладка
}

// Data Management
function loadData() {
    const savedParticipants = localStorage.getItem('participants');
    const savedWeightEntries = localStorage.getItem('weightEntries');
    const savedChallengeSettings = localStorage.getItem('challengeSettings');

    if (savedParticipants) {
        participants = JSON.parse(savedParticipants);
        // Добавляем статус существующим участникам, если его нет
        participants.forEach(participant => {
            if (!participant.status) {
                participant.status = 'participating';
            }
        });
    } else {
        // Начинаем с пустого списка участников
        participants = [];
        saveData();
    }

    if (savedWeightEntries) {
        weightEntries = JSON.parse(savedWeightEntries);
    } else {
        // Начинаем с пустого списка записей веса
        weightEntries = [];
        saveData();
    }

    if (savedChallengeSettings) {
        const savedSettings = JSON.parse(savedChallengeSettings);
        challengeSettings = { ...challengeSettings, ...savedSettings };
        // Призовой фонд рассчитывается динамически, не загружаем его
    }
}

function saveData() {
    localStorage.setItem('participants', JSON.stringify(participants));
    localStorage.setItem('weightEntries', JSON.stringify(weightEntries));
    // Не сохраняем призовой фонд, так как он рассчитывается динамически
    const settingsToSave = { ...challengeSettings };
    delete settingsToSave.prizePool;
    localStorage.setItem('challengeSettings', JSON.stringify(settingsToSave));
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation - Fixed to work properly
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            console.log('Tab clicked, switching to:', tabId); // Отладка
            switchTab(tabId);
        });
    });

    // Forms
    document.getElementById('addParticipantForm').addEventListener('submit', handleAddParticipant);
    document.getElementById('editParticipantForm').addEventListener('submit', handleEditParticipant);

    // Participant selector for analytics - removed since we no longer have individual charts
    // document.getElementById('participantSelector').addEventListener('change', function() {
    //     renderIndividualChart(this.value);
    // });

    // Modal close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });

    // Theme switcher
    setupThemeSwitcher();
}

// Tab Navigation - Fixed implementation
function switchTab(tabId) {
    console.log('Switching to tab:', tabId); // Отладка
    
    // Remove active class from all tabs and content
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(tabId);
    
    console.log('Selected tab:', selectedTab); // Отладка
    console.log('Selected content:', selectedContent); // Отладка
    
    if (selectedTab && selectedContent) {
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
        console.log('Tab activated successfully'); // Отладка
    } else {
        console.error('Tab or content not found!'); // Отладка
    }

    // Refresh content based on tab
    setTimeout(() => {
        console.log('About to render content for tab:', tabId); // Отладка
        switch(tabId) {
            case 'dashboard':
                console.log('Rendering dashboard...'); // Отладка
                renderDashboard();
                break;
            case 'participants':
                console.log('Rendering participants...'); // Отладка
                renderParticipants();
                break;
            case 'weight-entry':
                console.log('Rendering weight entry...'); // Отладка
                renderWeightEntry();
                break;
            default:
                console.log('Unknown tab:', tabId); // Отладка
        }
        console.log('Content rendering completed for tab:', tabId); // Отладка
    }, 100); // Увеличиваем задержку для стабильности
}

// Dashboard Rendering
function renderDashboard() {
    const stats = calculateStats();
    
    document.getElementById('totalParticipants').textContent = participants.length;
    document.getElementById('averageProgress').textContent = stats.averageProgress + '%';
    document.getElementById('totalWeightLost').textContent = stats.totalWeightLost + ' кг';

    renderAllParticipantsRanking();
    
    // Render charts after a small delay to ensure canvas is visible
    setTimeout(() => {
        renderGroupProgressChart();
        renderGroupWeightChart();
    }, 100);
}

function calculateStats() {
    let totalWeightLost = 0;
    let validProgressCount = 0;
    let totalProgress = 0;

    participants.forEach(participant => {
        const latestWeight = getLatestWeight(participant.id);
        if (latestWeight !== null) {
            const weightLost = participant.startWeight - latestWeight;
            const progressPercent = (weightLost / participant.startWeight) * 100;
            
            totalWeightLost += Math.max(0, weightLost);
            totalProgress += progressPercent;
            validProgressCount++;
        }
    });

    return {
        totalWeightLost: totalWeightLost.toFixed(1),
        averageProgress: validProgressCount > 0 ? (totalProgress / validProgressCount).toFixed(1) : '0'
    };
}

// Функция для расчета дней челленджа для конкретного участника
function getParticipantChallengeDays(participant) {
    const today = new Date();
    const joinDate = new Date(participant.joinDate);
    const challengeEndDate = new Date(joinDate.getTime() + challengeSettings.duration * 24 * 60 * 60 * 1000);
    
    // Если челлендж еще идет для участника
    if (today <= challengeEndDate) {
        const daysPassed = Math.ceil((today - joinDate) / (24 * 60 * 60 * 1000));
        const daysRemaining = Math.max(0, challengeSettings.duration - daysPassed);
        return {
            daysPassed: Math.max(0, daysPassed),
            daysRemaining: daysRemaining,
            isActive: true
        };
    } else {
        // Челлендж завершен для участника
        return {
            daysPassed: challengeSettings.duration,
            daysRemaining: 0,
            isActive: false
        };
    }
}

function renderAllParticipantsRanking() {
    const leaderboard = calculateLeaderboard(); // Все участники, отсортированные по прогрессу
    const rankingContainer = document.getElementById('allParticipantsRanking');
    
    // Создаем таблицу рейтинга
    const tableHTML = `
        <div class="ranking-table">
            <div class="ranking-table-header">
                <div class="ranking-col rank-col">Место</div>
                <div class="ranking-col name-col">Имя</div>
                <div class="ranking-col">Сбросил (кг)</div>
                <div class="ranking-col">Прогресс (%)</div>
                <div class="ranking-col">Стартовый вес</div>
                <div class="ranking-col">Текущий вес</div>
                <div class="ranking-col">Дни в челлендже</div>
                <div class="ranking-col">Статус</div>
            </div>
            <div class="ranking-table-body">
                ${leaderboard.map((item, index) => {
                    const participant = participants.find(p => p.id === item.id);
                    const latestWeight = getLatestWeight(participant.id);
                    const weightLost = latestWeight ? (participant.startWeight - latestWeight).toFixed(1) : 0;
                    const challengeDays = getParticipantChallengeDays(participant);
                    
                    return `
                        <div class="ranking-row ${index < 3 ? 'top-three' : ''}">
                            <div class="ranking-col rank-col">
                                <span class="rank-number">${index + 1}</span>
                            </div>
                            <div class="ranking-col name-col">
                                <span class="participant-name">${item.name}</span>
                            </div>
                            <div class="ranking-col">
                                <span class="detail-value">${weightLost} кг</span>
                            </div>
                            <div class="ranking-col">
                                <span class="detail-value ${parseFloat(item.progress) < 0 ? 'status-negative' : 'status-positive'}">${item.progress}%</span>
                            </div>
                            <div class="ranking-col">
                                <span class="detail-value">${participant.startWeight} кг</span>
                            </div>
                            <div class="ranking-col">
                                <span class="detail-value">${latestWeight || '—'} кг</span>
                            </div>
                            <div class="ranking-col">
                                <span class="detail-value">${challengeDays.daysPassed}/${challengeSettings.duration}</span>
                            </div>
                            <div class="ranking-col">
                                <span class="detail-value ${getParticipantStatusClass(participant, challengeDays)}">
                                    ${getParticipantStatusText(participant, challengeDays)}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    rankingContainer.innerHTML = tableHTML;
}

// Participants Management
function renderParticipants() {
    console.log('=== renderParticipants called ==='); // Отладка
    const participantsList = document.getElementById('participantsList');
    console.log('participantsList element:', participantsList); // Отладка
    
    if (!participantsList) {
        console.error('participantsList element not found!'); // Отладка
        return;
    }
    
    // Создаем заголовок таблицы
    const tableHeader = `
        <div class="participants-table">
            <div class="participants-table-header">
                <div class="participant-col name-col">Имя</div>
                <div class="participant-col">Присоединился</div>
                <div class="participant-col">Дни челленджа</div>
                <div class="participant-col">Стартовый вес</div>
                <div class="participant-col">Текущий вес</div>
                <div class="participant-col">Прогресс</div>
                <div class="participant-col">Сброшено (кг)</div>
                <div class="participant-col">Статус</div>
                <div class="participant-col">Прогресс бар</div>
                <div class="participant-col actions-col">Действия</div>
            </div>
            <div class="participants-table-body">
                ${participants.map(participant => {
                    const latestWeight = getLatestWeight(participant.id);
                    const progress = latestWeight ? 
                        ((participant.startWeight - latestWeight) / participant.startWeight * 100).toFixed(1) : 0;
                    const progressPercent = Math.min(100, Math.max(0, Math.abs(progress)));
                    const challengeDays = getParticipantChallengeDays(participant);
                    
                    return `
                        <div class="participant-row">
                            <div class="participant-col name-col">
                                <span class="participant-name">${participant.name}</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value">${formatDate(participant.joinDate)}</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value">${challengeDays.daysPassed}/${challengeSettings.duration}</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value">${participant.startWeight} кг</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value">${latestWeight || '—'} кг</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value ${progress < 0 ? 'status-negative' : 'status-positive'}">${progress}%</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value">${latestWeight ? Math.abs(participant.startWeight - latestWeight).toFixed(1) : '0'} кг</span>
                            </div>
                            <div class="participant-col">
                                <span class="participant-stat-value ${getParticipantStatusClass(participant, challengeDays)}">
                                    ${getParticipantStatusText(participant, challengeDays)}
                                </span>
                            </div>
                            <div class="participant-col">
                                <div class="progress-bar">
                                    <div class="progress-fill ${progress < 0 ? 'negative' : ''}" 
                                         style="width: ${Math.min(100, Math.max(0, progressPercent))}%"></div>
                                </div>
                            </div>
                            <div class="participant-col actions-col">
                                <div class="participant-actions">
                                    <button class="btn-icon" onclick="editParticipant(${participant.id})" title="Редактировать">
                                        ✏️
                                    </button>
                                    <button class="btn-icon btn-danger" onclick="deleteParticipant(${participant.id})" title="Удалить">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    participantsList.innerHTML = tableHeader;
}

// Modal functions - made globally accessible
window.showAddParticipantModal = function() {
    document.getElementById('addParticipantModal').classList.remove('hidden');
    document.getElementById('participantName').focus();
}

window.hideAddParticipantModal = function() {
    document.getElementById('addParticipantModal').classList.add('hidden');
    document.getElementById('addParticipantForm').reset();
}

function handleAddParticipant(e) {
    e.preventDefault();
    
    const name = document.getElementById('participantName').value.trim();
    const startWeightInput = document.getElementById('startWeight').value;
    const startWeight = startWeightInput ? parseFloat(startWeightInput) : null;
    const joinDate = document.getElementById('joinDate').value;
    
    if (!name || !joinDate) {
        alert('Пожалуйста, заполните имя и дату начала челленджа');
        return;
    }
    
    // Проверяем, можно ли еще присоединиться к челленджу
    const selectedDate = new Date(joinDate);
    const challengeStartDate = new Date(challengeSettings.challengeStartDate);
    const challengeEndDate = new Date(challengeSettings.challengeEndDate);
    
    if (selectedDate < challengeStartDate || selectedDate > challengeEndDate) {
        alert('Дата начала челленджа должна быть в период с 25.08.2025 по 07.09.2025');
        return;
    }
    
    const newParticipant = {
        id: Date.now(),
        name,
        startWeight,
        joinDate: joinDate,
        status: startWeight ? 'participating' : 'planned' // Добавляем статус
    };
    
    participants.push(newParticipant);
    
    // Add initial weight entry only if weight is provided
    if (startWeight) {
        weightEntries.push({
            participantId: newParticipant.id,
            date: joinDate,
            weight: startWeight
        });
    }
    
    saveData();
    hideAddParticipantModal();
    renderParticipants();
    renderWeightEntry();
    renderDashboard();
    // updateParticipantSelector(); // No longer needed
    
    if (startWeight) {
        alert(`Участник ${name} успешно добавлен! Начинает челлендж с ${formatDate(joinDate)}.`);
    } else {
        alert(`Участник ${name} зарегистрирован на будущее участие с ${formatDate(joinDate)}. Вес можно будет указать позже.`);
    }
}

window.editParticipant = function(id) {
    const participant = participants.find(p => p.id === id);
    if (!participant) return;
    
    document.getElementById('editParticipantId').value = id;
    document.getElementById('editParticipantName').value = participant.name;
    document.getElementById('editStartWeight').value = participant.startWeight;
    document.getElementById('editJoinDate').value = participant.joinDate;
    
    document.getElementById('editParticipantModal').classList.remove('hidden');
}

window.hideEditParticipantModal = function() {
    document.getElementById('editParticipantModal').classList.add('hidden');
    document.getElementById('editParticipantForm').reset();
}

function handleEditParticipant(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('editParticipantId').value);
    const name = document.getElementById('editParticipantName').value.trim();
    const startWeight = parseFloat(document.getElementById('editStartWeight').value);
    const joinDate = document.getElementById('editJoinDate').value;
    
    if (!name || !startWeight || !joinDate) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    // Проверяем, что новая дата в допустимом диапазоне
    const selectedDate = new Date(joinDate);
    const challengeStartDate = new Date(challengeSettings.challengeStartDate);
    const challengeEndDate = new Date(challengeSettings.challengeEndDate);
    
    if (selectedDate < challengeStartDate || selectedDate > challengeEndDate) {
        alert('Дата начала челленджа должна быть в период с 25.08.2025 по 07.09.2025');
        return;
    }
    
    const participantIndex = participants.findIndex(p => p.id === id);
    if (participantIndex !== -1) {
        const oldJoinDate = participants[participantIndex].joinDate;
        
        participants[participantIndex] = {
            ...participants[participantIndex],
            name,
            startWeight,
            joinDate: joinDate
        };
        
        // Если изменилась дата начала, обновляем первую запись о весе
        if (oldJoinDate !== joinDate) {
            const firstEntry = weightEntries.find(w => w.participantId === id && w.date === oldJoinDate);
            if (firstEntry) {
                firstEntry.date = joinDate;
            }
        }
        
        saveData();
        hideEditParticipantModal();
        renderParticipants();
        renderWeightEntry();
        renderDashboard();
        // updateParticipantSelector(); // No longer needed
        
        alert(`Данные участника ${name} обновлены!`);
    }
}

window.deleteParticipant = function(id) {
    const participant = participants.find(p => p.id === id);
    if (!participant) return;
    
    if (confirm(`Вы уверены, что хотите удалить участника ${participant.name}? Все данные о весе будут потеряны.`)) {
        participants = participants.filter(p => p.id !== id);
        weightEntries = weightEntries.filter(w => w.participantId !== id);
        
        saveData();
        renderParticipants();
        renderWeightEntry();
        renderDashboard();
        updateParticipantSelector();
        
        alert(`Участник ${participant.name} удален.`);
    }
}

// Weight Entry
function renderWeightEntry() {
    console.log('=== renderWeightEntry called ==='); // Отладка
    const selectedDate = document.getElementById('entryDate').value;
    const weightEntryList = document.getElementById('weightEntryList');
    console.log('weightEntryList element:', weightEntryList); // Отладка
    console.log('selectedDate:', selectedDate); // Отладка
    console.log('participants.length:', participants.length); // Отладка
    
    if (!weightEntryList) {
        console.error('weightEntryList element not found!'); // Отладка
        return;
    }
    
    if (participants.length === 0) {
        weightEntryList.innerHTML = '<div class="card"><div class="card__body">Нет участников. Добавьте участников во вкладке "Участники".</div></div>';
        return;
    }
    
    // Фильтруем участников: показываем только тех, кто уже участвует (не планирует)
    const activeParticipants = participants.filter(participant => {
        // Если у участника нет статуса, считаем его участвующим (для обратной совместимости)
        if (!participant.status) {
            participant.status = 'participating';
        }
        return participant.status === 'participating';
    });
    
    if (activeParticipants.length === 0) {
        weightEntryList.innerHTML = '<div class="card"><div class="card__body">Нет активных участников. Все челленджи завершены.</div></div>';
        return;
    }
    
    weightEntryList.innerHTML = activeParticipants.map(participant => {
        const existingEntry = weightEntries.find(w => 
            w.participantId === participant.id && w.date === selectedDate
        );
        const latestWeight = getLatestWeight(participant.id);
        const challengeDays = getParticipantChallengeDays(participant);
        
        return `
            <div class="weight-entry-card">
                <div class="weight-entry-header">
                    <h4 class="weight-entry-name">${participant.name}</h4>
                    <div class="current-weight">
                        Последний вес: ${latestWeight || participant.startWeight} кг
                    </div>
                    <div class="challenge-status">
                        День челленджа: ${challengeDays.daysPassed + 1}/${challengeSettings.duration}
                    </div>
                </div>
                <div class="weight-display">
                    <label class="form-label">Вес на ${formatDate(selectedDate)}:</label>
                    <div class="weight-value">
                        ${existingEntry ? existingEntry.weight + ' кг' : '—'}
                    </div>
                    <small class="weight-note">Ввод веса только через администратора</small>
                </div>
            </div>
        `;
    }).join('');
}

window.saveWeightEntries = function() {
    const weightInputs = document.querySelectorAll('.weight-input');
    let saved = false;
    let savedCount = 0;
    
    weightInputs.forEach(input => {
        const participantId = parseInt(input.dataset.participantId);
        const date = input.dataset.date;
        const weight = parseFloat(input.value);
        
        if (input.value.trim() && !isNaN(weight) && weight > 0) {
            const existingIndex = weightEntries.findIndex(w => 
                w.participantId === participantId && w.date === date
            );
            
            if (existingIndex !== -1) {
                weightEntries[existingIndex].weight = weight;
            } else {
                weightEntries.push({ participantId, date, weight });
            }
            saved = true;
            savedCount++;
        }
    });
    
    if (saved) {
        saveData();
        renderDashboard();
        renderParticipants();
        renderLeaderboard();
        alert(`Сохранено ${savedCount} записей о весе!`);
    } else {
        alert('Нет данных для сохранения. Введите вес хотя бы для одного участника.');
    }
}

// Leaderboard
function renderLeaderboard() {
    const leaderboard = calculateLeaderboard();
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div class="card"><div class="card__body">Нет участников для отображения в рейтинге.</div></div>';
        return;
    }
    
    leaderboardList.innerHTML = leaderboard.map((item, index) => `
        <div class="leaderboard-item">
            <div class="leaderboard-rank ${index < 3 ? `rank-${index + 1}` : ''}">${index + 1}</div>
            <div class="leaderboard-info">
                <h4 class="leaderboard-name">${item.name}</h4>
                <div class="leaderboard-details">
                    <span>Стартовый вес: ${item.startWeight} кг</span>
                    <span>Текущий вес: ${item.currentWeight || '—'} кг</span>
                    <span>Присоединился: ${formatDate(item.joinDate)}</span>
                    <span>Статус: ${item.challengeStatus}</span>
                </div>
            </div>
            <div class="leaderboard-progress ${parseFloat(item.progress) < 0 ? 'negative' : ''}">${item.progress}%</div>
        </div>
    `).join('');
}

function calculateLeaderboard() {
    return participants
        .map(participant => {
            const latestWeight = getLatestWeight(participant.id);
            const progress = latestWeight ? 
                ((participant.startWeight - latestWeight) / participant.startWeight * 100) : 0;
            const challengeDays = getParticipantChallengeDays(participant);
            
            return {
                id: participant.id,
                name: participant.name,
                startWeight: participant.startWeight,
                currentWeight: latestWeight,
                progress: progress.toFixed(1),
                joinDate: participant.joinDate,
                challengeStatus: challengeDays.isActive ? 'Активен' : 'Завершен',
                daysInChallenge: challengeDays.daysPassed
            };
        })
        .sort((a, b) => parseFloat(b.progress) - parseFloat(a.progress));
}

// Analytics and Charts
function renderAnalytics() {
    // updateParticipantSelector(); // No longer needed
    setTimeout(() => {
        renderAllParticipantsChart();
    }, 100);
}

function updateParticipantSelector() {
    // This function is no longer needed since we removed the participant selector
    // const selector = document.getElementById('participantSelector');
    // 
    // selector.innerHTML = '<option value="">Выберите участника</option>' +
    //     participants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function renderGroupProgressChart() {
    const canvas = document.getElementById('groupProgressChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (groupProgressChart) {
        groupProgressChart.destroy();
    }
    
    // Всегда показываем все 14 дней челленджа
    const challengeDays = Array.from({length: challengeSettings.duration}, (_, i) => i + 1);
    
    // Создаем датасеты для каждого участника - используем яркие цвета
    const colors = getBrightChartColors();
    const datasets = participants.map((participant, index) => {
        const challengeDays = getParticipantChallengeDays(participant);
        const maxDaysForParticipant = challengeDays.daysPassed;
        
        // Создаем массив дней только для этого участника
        const participantDays = Array.from({length: maxDaysForParticipant}, (_, i) => i + 1);
        
        const progressData = participantDays.map(day => {
            // Находим вес участника на определенный день челленджа
            const challengeStartDate = new Date(participant.joinDate);
            const targetDate = new Date(challengeStartDate);
            targetDate.setDate(targetDate.getDate() + day - 1);
            
            const weightOnDay = getWeightOnDate(participant.id, targetDate.toISOString().split('T')[0]);
            
            if (weightOnDay) {
                // Рассчитываем прогресс в процентах
                const progress = ((participant.startWeight - weightOnDay) / participant.startWeight) * 100;
                return progress;
            } else {
                // Если нет данных на этот день, но участник уже присоединился к челленджу
                const daysSinceJoin = Math.floor((targetDate - challengeStartDate) / (24 * 60 * 60 * 1000)) + 1;
                if (daysSinceJoin >= 0 && daysSinceJoin <= maxDaysForParticipant) {
                    // Возвращаем последний известный прогресс или 0
                    const lastKnownWeight = getLatestWeight(participant.id);
                    if (lastKnownWeight && targetDate <= new Date()) {
                        const lastProgress = ((participant.startWeight - lastKnownWeight) / participant.startWeight) * 100;
                        return lastProgress;
                    }
                    return 0;
                }
                return null;
            }
        });
        
        return {
            label: `${participant.name} (${maxDaysForParticipant} дн.)`,
            data: progressData,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });
    
    groupProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: challengeDays.map(day => `День ${day}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Прогресс участников по дням челленджа',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дни челленджа'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Прогресс (%)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverBackgroundColor: function(context) {
                        return context.dataset.borderColor;
                    }
                }
            }
        }
    });
}

function renderGroupWeightChart() {
    const canvas = document.getElementById('groupWeightChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (groupWeightChart) {
        groupWeightChart.destroy();
    }
    
    // Всегда показываем все 14 дней челленджа
    const challengeDays = Array.from({length: challengeSettings.duration}, (_, i) => i + 1);
    
    // Создаем датасеты для каждого участника - используем яркие цвета
    const colors = getBrightChartColors();
    
    const datasets = participants.map((participant, index) => {
        const challengeDays = getParticipantChallengeDays(participant);
        const maxDaysForParticipant = challengeDays.daysPassed;
        
        // Создаем массив дней только для этого участника
        const participantDays = Array.from({length: maxDaysForParticipant}, (_, i) => i + 1);
        
        const weightData = participantDays.map(day => {
            // Находим вес участника на определенный день челленджа
            const challengeStartDate = new Date(participant.joinDate);
            const targetDate = new Date(challengeStartDate);
            targetDate.setDate(targetDate.getDate() + day - 1);
            
            const weightOnDay = getWeightOnDate(participant.id, targetDate.toISOString().split('T')[0]);
            
            if (weightOnDay) {
                // Возвращаем вес в кг
                return weightOnDay;
            } else {
                // Если нет данных на этот день, но участник уже присоединился к челленджу
                const daysSinceJoin = Math.floor((targetDate - challengeStartDate) / (24 * 60 * 60 * 1000)) + 1;
                if (daysSinceJoin >= 0 && daysSinceJoin <= maxDaysForParticipant) {
                    // Возвращаем последний известный вес или стартовый вес
                    const lastKnownWeight = getLatestWeight(participant.id);
                    if (lastKnownWeight && targetDate <= new Date()) {
                        return lastKnownWeight;
                    }
                    return participant.startWeight;
                }
                // Возвращаем null для будущих дней - линия будет обрываться
                return null;
            }
        });
        
        return {
            label: `${participant.name} (${maxDaysForParticipant} дн.)`,
            data: weightData,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });
    
    groupWeightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: challengeDays.map(day => `День ${day}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Вес участников по дням челленджа',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дни челленджа'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Вес (кг)'
                    },
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value + ' кг';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverBackgroundColor: function(context) {
                        return context.dataset.borderColor;
                    }
                }
            }
        }
    });
}

function renderIndividualChart(participantId) {
    const canvas = document.getElementById('individualProgressChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (individualProgressChart) {
        individualProgressChart.destroy();
    }
    
    if (!participantId) return;
    
    const participant = participants.find(p => p.id == participantId);
    if (!participant) return;
    
    // Создаем массив дней челленджа (1-14)
    const challengeDays = Array.from({length: challengeSettings.duration}, (_, i) => i + 1);
    
            // Создаем данные для каждого дня челленджа
        const weightData = challengeDays.map(day => {
            const challengeStartDate = new Date(participant.joinDate);
            const targetDate = new Date(challengeStartDate);
            targetDate.setDate(targetDate.getDate() + day - 1);
            
            const weightOnDay = getWeightOnDate(participant.id, targetDate.toISOString().split('T')[0]);
            
            if (weightOnDay) {
                // Возвращаем вес в кг
                return weightOnDay;
            } else {
                // Если нет данных на этот день, но участник уже присоединился к челленджу
                const daysSinceJoin = Math.floor((targetDate - challengeStartDate) / (24 * 60 * 60 * 1000)) + 1;
                if (daysSinceJoin >= 0 && daysSinceJoin <= challengeSettings.duration) {
                    // Возвращаем последний известный вес или стартовый вес
                    const lastKnownWeight = getLatestWeight(participant.id);
                    if (lastKnownWeight && targetDate <= new Date()) {
                        return lastKnownWeight;
                    }
                    return participant.startWeight;
                }
                // Возвращаем null для будущих дней - линия будет обрываться
                return null;
            }
        });
    
    individualProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: challengeDays.map(day => `День ${day}`),
            datasets: [{
                label: `Вес - ${participant.name}`,
                data: weightData,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-chart-1') || '#FFC185',
                backgroundColor: (getComputedStyle(document.documentElement).getPropertyValue('--color-chart-1') || '#FFC185') + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Динамика веса участника - ${participant.name}`
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дни челленджа'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Вес (кг)'
                    },
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value + ' кг';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function renderAllParticipantsChart() {
    const canvas = document.getElementById('allParticipantsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (allParticipantsChart) {
        allParticipantsChart.destroy();
    }
    
    // Создаем массив дней челленджа (1-14)
    const challengeDays = Array.from({length: challengeSettings.duration}, (_, i) => i + 1);
    
    const colors = [
        getComputedStyle(document.documentElement).getPropertyValue('--color-chart-1') || '#1FB8CD',
        getComputedStyle(document.documentElement).getPropertyValue('--color-chart-2') || '#FFC185',
        getComputedStyle(document.documentElement).getPropertyValue('--color-chart-3') || '#B4413C',
        getComputedStyle(document.documentElement).getPropertyValue('--color-chart-4') || '#ECEBD5',
        getComputedStyle(document.documentElement).getPropertyValue('--color-chart-5') || '#5D878F',
        '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'
    ];
    
    const datasets = participants.map((participant, index) => {
        // Создаем данные для каждого дня челленджа
        const progressData = challengeDays.map(day => {
            const challengeStartDate = new Date(participant.joinDate);
            const targetDate = new Date(challengeStartDate);
            targetDate.setDate(targetDate.getDate() + day - 1);
            
            const weightOnDay = getWeightOnDate(participant.id, targetDate.toISOString().split('T')[0]);
            
            if (weightOnDay) {
                // Рассчитываем прогресс в процентах
                const progress = ((participant.startWeight - weightOnDay) / participant.startWeight) * 100;
                return progress;
            } else {
                // Если нет данных на этот день, но участник уже присоединился к челленджу
                const daysSinceJoin = Math.floor((targetDate - challengeStartDate) / (24 * 60 * 60 * 1000)) + 1;
                if (daysSinceJoin >= 0 && daysSinceJoin <= challengeSettings.duration) {
                    // Возвращаем последний известный прогресс или 0
                    const lastKnownWeight = getLatestWeight(participant.id);
                    if (lastKnownWeight && targetDate <= new Date()) {
                        const lastProgress = ((participant.startWeight - lastKnownWeight) / participant.startWeight) * 100;
                        return lastProgress;
                        return lastProgress;
                    }
                    return 0;
                }
                // Возвращаем null для будущих дней - линия будет обрываться
                return null;
            }
        });
        
        return {
            label: participant.name,
            data: progressData,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5
        };
    });
    
    allParticipantsChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: challengeDays.map(day => `День ${day}`),
            datasets 
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Прогресс всех участников по дням челленджа',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дни челленджа'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Прогресс (%)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Utility Functions
function getLatestWeight(participantId) {
    const entries = weightEntries
        .filter(w => w.participantId === participantId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return entries.length > 0 ? entries[0].weight : null;
}

function getWeightOnDate(participantId, date) {
    const entry = weightEntries.find(w => w.participantId === participantId && w.date === date);
    return entry ? entry.weight : null;
}

function getUniqueDates() {
    return [...new Set(weightEntries.map(w => w.date))].sort();
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}

function updateDateInput() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('entryDate');
    if (dateInput) {
        dateInput.value = today;
        dateInput.addEventListener('change', renderWeightEntry);
        
        // Устанавливаем минимальную дату как начало челленджа
        const challengeStartDate = new Date(challengeSettings.challengeStartDate);
        dateInput.min = challengeStartDate.toISOString().split('T')[0];
        
        // Устанавливаем максимальную дату как конец периода регистрации + длительность челленджа
        const maxDate = new Date(challengeSettings.challengeEndDate);
        maxDate.setDate(maxDate.getDate() + challengeSettings.duration);
        dateInput.max = maxDate.toISOString().split('T')[0];
    }
    
    // Устанавливаем значение по умолчанию для поля joinDate в модальном окне
    const joinDateInput = document.getElementById('joinDate');
    if (joinDateInput) {
        joinDateInput.value = today;
        
        // Устанавливаем ограничения для даты начала челленджа
        const challengeStartDate = new Date(challengeSettings.challengeStartDate);
        const challengeEndDate = new Date(challengeSettings.challengeEndDate);
        
        joinDateInput.min = challengeStartDate.toISOString().split('T')[0];
        joinDateInput.max = challengeEndDate.toISOString().split('T')[0];
    }
}

function updateChallengeInfo() {
    const challengeStartDate = new Date(challengeSettings.challengeStartDate);
    const challengeEndDate = new Date(challengeSettings.challengeEndDate);
    const today = new Date();
    
    // Проверяем, активен ли период регистрации
    const isRegistrationActive = today >= challengeStartDate && today <= challengeEndDate;
    
    // Если регистрация активна, показываем дни до конца регистрации
    // Если регистрация закончилась, показываем 0
    const daysRemaining = isRegistrationActive ? 
        Math.max(0, Math.ceil((challengeEndDate - today) / (24 * 60 * 60 * 1000))) : 0;
    
    const daysRemainingEl = document.getElementById('daysRemaining');
    const prizePoolEl = document.getElementById('prizePool');
    
    if (daysRemainingEl) {
        if (isRegistrationActive) {
            daysRemainingEl.textContent = daysRemaining;
        } else {
            daysRemainingEl.textContent = '0';
        }
    }
    if (prizePoolEl) {
        prizePoolEl.textContent = `${calculatePrizePool()} ${challengeSettings.currency}`;
    }
}

// Функция для расчета призового фонда
function calculatePrizePool() {
    return participants.length * 1000;
}

// Вспомогательные функции для определения статуса участника
function getParticipantStatusClass(participant, challengeDays) {
    if (participant.status === 'planned') {
        return 'status-planned';
    } else if (challengeDays.isActive) {
        return 'status-active';
    } else {
        return 'status-completed';
    }
}

function getParticipantStatusText(participant, challengeDays) {
    if (participant.status === 'planned') {
        return 'Планирует участие';
    } else if (challengeDays.isActive) {
        return 'Участвует';
    } else {
        return 'Завершен';
    }
}

// Theme switching functionality
function setupThemeSwitcher() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('selectedTheme') || 'light';
    
    // Устанавливаем сохраненную тему
    setTheme(savedTheme);
    
    // Добавляем обработчики для кнопок
    themeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.dataset.theme;
            setTheme(theme);
            localStorage.setItem('selectedTheme', theme);
            
            // Обновляем активную кнопку
            themeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Устанавливаем активную кнопку
    themeButtons.forEach(btn => {
        if (btn.dataset.theme === savedTheme) {
            btn.classList.add('active');
        }
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Обновляем цвета для графиков Chart.js
    if (window.Chart) {
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--color-text');
        Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--color-border');
    }
    
    // Перерисовываем графики с новыми цветами
    setTimeout(() => {
        if (groupProgressChart) {
            renderGroupProgressChart();
        }
        if (groupWeightChart) {
            renderGroupWeightChart();
        }
        if (allParticipantsChart) {
            renderAllParticipantsChart();
        }
    }, 100);
}

// Admin password functionality
const ADMIN_PASSWORD = 'admin123'; // Пароль администратора

// Функция для получения ярких цветов графиков
function getBrightChartColors() {
    return [
        '#FF6B6B', // Яркий красный
        '#4ECDC4', // Яркий бирюзовый
        '#45B7D1', // Яркий синий
        '#96CEB4', // Яркий зеленый
        '#FFEAA7', // Яркий желтый
        '#DDA0DD', // Яркий фиолетовый
        '#98D8C8', // Яркий мятный
        '#F7DC6F', // Яркий золотой
        '#BB8FCE', // Яркий лавандовый
        '#85C1E9'  // Яркий голубой
    ];
}

function showAdminPasswordModal() {
    document.getElementById('adminPasswordModal').classList.remove('hidden');
    document.getElementById('adminPassword').focus();
}

function hideAdminPasswordModal() {
    document.getElementById('adminPasswordModal').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
}

function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        hideAdminPasswordModal();
        showWeightEntryModal();
        // Сохраняем сессию администратора
        sessionStorage.setItem('adminAuthenticated', 'true');
    } else {
        alert('Неверный пароль!');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

function showWeightEntryModal() {
    // Показываем модальное окно для ввода веса участников
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>Ввод веса участников</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="weight-entry-admin">
                    ${participants.map(participant => `
                        <div class="participant-weight-entry">
                            <h4>${participant.name}</h4>
                            <div class="weight-inputs">
                                <div class="form-group">
                                    <label>Стартовый вес (кг):</label>
                                    <input type="number" step="0.1" class="form-control start-weight" 
                                           data-participant-id="${participant.id}" 
                                           value="${participant.startWeight || ''}" 
                                           placeholder="Введите стартовый вес">
                                </div>
                                <div class="form-group">
                                    <label>Текущий вес (кг):</label>
                                    <input type="number" step="0.1" class="form-control current-weight" 
                                           data-participant-id="${participant.id}" 
                                           placeholder="Введите текущий вес">
                                </div>
                                <div class="form-group">
                                    <label>Финальный вес на 14 день (17:00):</label>
                                    <input type="number" step="0.1" class="form-control final-weight" 
                                           data-participant-id="${participant.id}" 
                                           placeholder="Введите финальный вес">
                                    <small class="form-help">Вес на последний день челленджа в 17:00</small>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn--primary" onclick="saveAdminWeightEntries(this)">Сохранить все изменения</button>
                    <button type="button" class="btn btn--secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function saveAdminWeightEntries(button) {
    const weightInputs = document.querySelectorAll('.weight-entry-admin input');
    let hasChanges = false;
    
    weightInputs.forEach(input => {
        const participantId = parseInt(input.dataset.participantId);
        const participant = participants.find(p => p.id === participantId);
        
        if (input.classList.contains('start-weight')) {
            const newStartWeight = parseFloat(input.value);
            if (newStartWeight && newStartWeight !== participant.startWeight) {
                participant.startWeight = newStartWeight;
                hasChanges = true;
            }
        } else if (input.classList.contains('current-weight')) {
            const newCurrentWeight = parseFloat(input.value);
            if (newCurrentWeight) {
                // Добавляем запись о весе на сегодняшнюю дату
                const today = new Date().toISOString().split('T')[0];
                const existingEntry = weightEntries.find(entry => 
                    entry.participantId === participantId && entry.date === today
                );
                
                if (existingEntry) {
                    existingEntry.weight = newCurrentWeight;
                } else {
                    weightEntries.push({
                        participantId: participantId,
                        date: today,
                        weight: newCurrentWeight
                    });
                }
                hasChanges = true;
            }
        } else if (input.classList.contains('final-weight')) {
            const newFinalWeight = parseFloat(input.value);
            if (newFinalWeight) {
                // Добавляем запись о финальном весе на 14 день в 17:00
                const challengeStartDate = new Date(participant.joinDate);
                const finalDate = new Date(challengeStartDate);
                finalDate.setDate(finalDate.getDate() + 13); // 14-й день (индексация с 0)
                finalDate.setHours(17, 0, 0, 0); // 17:00
                
                const finalDateString = finalDate.toISOString().split('T')[0];
                const existingEntry = weightEntries.find(entry => 
                    entry.participantId === participantId && entry.date === finalDateString
                );
                
                if (existingEntry) {
                    existingEntry.weight = newFinalWeight;
                } else {
                    weightEntries.push({
                        participantId: participantId,
                        date: finalDateString,
                        weight: newFinalWeight
                    });
                }
                hasChanges = true;
            }
        }
    });
    
    if (hasChanges) {
        saveData();
        alert('Изменения сохранены!');
        button.closest('.modal').remove();
        // Обновляем отображение
        renderDashboard();
        renderParticipants();
        renderWeightEntry();
    } else {
        alert('Нет изменений для сохранения');
    }
}

// Data management functions
window.clearAllData = function() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ данные? Это действие нельзя отменить!')) {
        if (prompt('Введите пароль администратора для подтверждения:') === ADMIN_PASSWORD) {
            participants = [];
            weightEntries = [];
            localStorage.clear();
            alert('Все данные удалены! Приложение перезагружено.');
            location.reload();
        } else {
            alert('Неверный пароль! Данные не удалены.');
        }
    }
};

// Export functionality
window.exportData = function() {
    const leaderboard = calculateLeaderboard();
    let csvContent = "Позиция,Имя,Дата присоединения,Стартовый вес,Текущий вес,Прогресс (%),Статус челленджа\n";
    
    leaderboard.forEach((item, index) => {
        csvContent += `${index + 1},"${item.name}","${formatDate(item.joinDate)}",${item.startWeight},"${item.currentWeight || '—'}",${item.progress},"${item.challengeStatus}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `challenge_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Данные экспортированы в CSV файл!');
}