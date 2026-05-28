diff --git a/app.js b/app.js
index 16966f02941cf3f47bfc686d30743dc4d19e597a..2eddb059f822a7e6dc80065be91389dd817ec02c 100644
--- a/app.js
+++ b/app.js
@@ -679,50 +679,70 @@ function selectQuestion() {
         .map((q, i) => ({ ...q, originalIndex: i }))
         .filter((q, i) => !state.usedQuestions.has(i));
     if (available.length === 0) {
         state.usedQuestions.clear();
         available = state.questions.map((q, i) => ({ ...q, originalIndex: i }));
     }
     if (available.length === 0) return null;
 
     const totalWeight = available.reduce((sum, q) => sum + q.weight, 0);
     let rand = Math.random() * totalWeight;
     for (const q of available) {
         rand -= q.weight;
         if (rand <= 0) { state.usedQuestions.add(q.originalIndex); return q; }
     }
     const last = available[available.length - 1];
     state.usedQuestions.add(last.originalIndex);
     return last;
 }
 
 // ========== ANSWER CHECKING ==========
 function checkAnswer(userAnswer, correctAnswers) {
     const normalizedUser = userAnswer.trim().toLowerCase();
     return correctAnswers.some(a => a.trim().toLowerCase() === normalizedUser);
 }
 
+function placeAnswerInputInQuestionGap(answerInput) {
+    const answerArea = document.querySelector('.answer-area');
+    const submitBtn = document.getElementById('submit-answer-btn');
+    const questionGap = document.querySelector('#question-text .question-gap');
+
+    answerInput.classList.remove('inline-answer-input');
+    answerArea.classList.remove('has-inline-answer');
+
+    if (questionGap) {
+        const gapWidth = questionGap.style.getPropertyValue('--gap-ch');
+        if (gapWidth) answerInput.style.setProperty('--gap-ch', gapWidth);
+        questionGap.replaceWith(answerInput);
+        answerInput.classList.add('inline-answer-input');
+        answerArea.classList.add('has-inline-answer');
+    } else {
+        answerInput.style.removeProperty('--gap-ch');
+        answerArea.insertBefore(answerInput, submitBtn);
+    }
+}
+
 // ========== GAME FLOW ==========
 // New flow: ATACAR → Dice Roll → Question → Territory Selection (if correct)
 
 function initAttackButton() {
     document.getElementById('attack-btn').addEventListener('click', onAttack);
     document.getElementById('selection-confirm-btn').addEventListener('click', onConfirmSelection);
 }
 
 function onAttack() {
     if (state.gameEnded || state.selectionMode || state.draftPhase) return;
 
     const attackable = getAttackableTerritories(state.currentTeamIndex);
     if (attackable.length === 0) {
         if (checkDomination()) {
             endGame();
             return;
         }
         nextTurn();
         return;
     }
 
     const question = selectQuestion();
     if (!question) {
         nextTurn();
         return;
@@ -732,56 +752,61 @@ function onAttack() {
 
     // Step 1: Roll the dice
     showDiceRoll((diceResult) => {
         // Step 2: Show the question
         showQuestion(question, diceResult);
     });
 }
 
 function showQuestion(question, diceResult) {
     const modal = document.getElementById('question-modal');
     const team = state.teams[state.currentTeamIndex];
     const playerIdx = state.currentPlayerIndices[state.currentTeamIndex];
     const player = team.players[playerIdx % team.players.length];
 
     document.getElementById('modal-team-name').textContent = team.name;
     document.getElementById('modal-team-name').style.color = team.color;
     document.getElementById('modal-player-name').textContent = player;
     document.getElementById('modal-header').style.background =
         `linear-gradient(135deg, ${team.color}20, ${team.color}05)`;
 
     // Dice info in header
     const plural = diceResult === 1 ? 'território' : 'territórios';
     document.getElementById('modal-dice-info').textContent = `🎲 ${diceResult} ${plural}`;
     document.getElementById('modal-territory-info').textContent = '';
 
+    const answerInput = document.getElementById('answer-input');
+    const answerArea = document.querySelector('.answer-area');
+    const submitButton = document.getElementById('submit-answer-btn');
+    answerArea.insertBefore(answerInput, submitButton);
+
     document.getElementById('question-weight').textContent =
         question.weight > 1 ? `★ Peso ${question.weight}` : '';
     document.getElementById('question-text').innerHTML = formatQuestionHTML(question.text);
 
-    const answerInput = document.getElementById('answer-input');
     answerInput.value = '';
+    placeAnswerInputInQuestionGap(answerInput);
 
     modal.classList.remove('hidden');
     setTimeout(() => answerInput.focus(), 300);
 
     startTimer(question.timeLimit, question);
 
     const submitBtn = document.getElementById('submit-answer-btn');
     const handleSubmit = () => {
         submitBtn.removeEventListener('click', handleSubmit);
         answerInput.removeEventListener('keydown', handleKeydown);
         processAnswer(answerInput.value, question);
     };
     const handleKeydown = (e) => { if (e.key === 'Enter') handleSubmit(); };
 
     submitBtn.addEventListener('click', handleSubmit);
     answerInput.addEventListener('keydown', handleKeydown);
     modal._handleSubmit = handleSubmit;
     modal._handleKeydown = handleKeydown;
 }
 
 function startTimer(seconds, question) {
     state.timeRemaining = seconds;
     const totalTime = seconds;
     const timerBar = document.getElementById('timer-bar');
     const timerText = document.getElementById('timer-text');
@@ -1149,54 +1174,55 @@ function exitSelectionMode() {
 function afterTurnEnd() {
     updateScoreboard();
     updateQuestionsRemaining();
     clearHighlights();
 
     if (checkDomination()) {
         endGame();
         return;
     }
     nextTurn();
 }
 
 function nextTurn() {
     state.currentPlayerIndices[state.currentTeamIndex]++;
     state.currentOrderPos = (state.currentOrderPos + 1) % state.turnOrder.length;
     if (state.currentOrderPos === 0) state.round++;
     state.currentTeamIndex = state.turnOrder[state.currentOrderPos];
 
     state.diceResult = 0;
     state.claimedThisTurn = [];
     updateScoreboard();
     updateTurnInfo();
 }
 
 function checkDomination() {
-    for (let i = 0; i < state.teams.length; i++) {
-        if (state.territories.filter(t => t.owner === i).length === state.territories.length) return true;
-    }
-    return false;
+    const activeTeams = state.teams
+        .map((team, index) => ({ team, index }))
+        .filter(({ index }) => state.territories.some(t => t.owner === index));
+
+    return activeTeams.length === 1;
 }
 
 // ========== END GAME ==========
 function endGame() {
     state.gameEnded = true;
     clearInterval(state.timerInterval);
     document.getElementById('game-screen').classList.remove('active');
     document.getElementById('results-screen').classList.add('active');
     renderResults();
 }
 
 function renderResults() {
     const teamResults = state.teams.map((team, i) => ({
         index: i, name: team.name, color: team.color,
         territories: state.territories.filter(t => t.owner === i).length
     }));
     teamResults.sort((a, b) => b.territories - a.territories);
 
     const podium = document.getElementById('podium');
     podium.innerHTML = '';
     const medals = ['🥇', '🥈', '🥉', '4º', '5º'];
     const barHeights = [220, 170, 130, 100, 80];
 
     teamResults.forEach((team, rank) => {
         const place = document.createElement('div');
