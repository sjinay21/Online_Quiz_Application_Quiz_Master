class QuizApplication {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.timeLimit = 30; // minutes
        this.totalQuestions = 20;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.userAnswers = [];
        this.quizStarted = false;
        this.startTime = null;
        this.endTime = null;
        this.difficulty = 'any';
        this.category = 'any';

        this.initializeElements();
        this.bindEvents();
        this.updateRangeDisplays();
    }

    initializeElements() {
        // Screens
        this.setupScreen = document.getElementById('setupScreen');
        this.quizScreen = document.getElementById('quizScreen');
        this.resultsScreen = document.getElementById('resultsScreen');

        // Setup elements
        this.timeLimitInput = document.getElementById('timeLimit');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.questionCountInput = document.getElementById('questionCount');
        this.questionDisplay = document.getElementById('questionDisplay');
        this.difficultySelect = document.getElementById('difficulty');
        this.categorySelect = document.getElementById('category');
        this.startQuizBtn = document.getElementById('startQuiz');

        // Quiz elements
        this.timerElement = document.getElementById('timer');
        this.progressBar = document.getElementById('progressBar');
        this.questionCounter = document.getElementById('questionCounter');
        this.questionText = document.getElementById('questionText');
        this.optionsContainer = document.getElementById('optionsContainer');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        // Results elements
        this.finalScore = document.getElementById('finalScore');
        this.percentage = document.getElementById('percentage');
        this.totalQuestionsEl = document.getElementById('totalQuestions');
        this.correctAnswers = document.getElementById('correctAnswers');
        this.timeTaken = document.getElementById('timeTaken');
        this.performanceMessage = document.getElementById('performanceMessage');
        this.reviewAnswersBtn = document.getElementById('reviewAnswers');
        this.restartQuizBtn = document.getElementById('restartQuiz');
    }

    bindEvents() {
        this.timeLimitInput.addEventListener('input', () => this.updateRangeDisplays());
        this.questionCountInput.addEventListener('input', () => this.updateRangeDisplays());
        this.startQuizBtn.addEventListener('click', () => this.startQuiz());
        this.prevBtn.addEventListener('click', () => this.previousQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.restartQuizBtn.addEventListener('click', () => this.restartQuiz());
        this.reviewAnswersBtn.addEventListener('click', () => this.reviewAnswers());
    }

    updateRangeDisplays() {
        this.timeDisplay.textContent = `${this.timeLimitInput.value} minutes`;
        this.questionDisplay.textContent = `${this.questionCountInput.value} questions`;
    }

    async startQuiz() {
        // Get user preferences
        this.timeLimit = parseInt(this.timeLimitInput.value);
        this.totalQuestions = parseInt(this.questionCountInput.value);
        this.difficulty = this.difficultySelect.value;
        this.category = this.categorySelect.value;
        this.timeRemaining = this.timeLimit * 60; // Convert to seconds
        this.startTime = new Date();

        // Show loading state
        this.startQuizBtn.textContent = 'Loading Questions...';
        this.startQuizBtn.disabled = true;

        try {
            // Load questions from Open Trivia DB API
            await this.loadQuestions();

            if (this.questions.length === 0) {
                alert('No questions available from the API. Please try again with different settings.');
                this.startQuizBtn.textContent = 'Start Quiz';
                this.startQuizBtn.disabled = false;
                return;
            }

            // Switch to quiz screen
            this.setupScreen.classList.remove('active');
            this.quizScreen.classList.add('active');

            // Initialize quiz
            this.quizStarted = true;
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.userAnswers = new Array(this.questions.length).fill(null);

            // Start timer
            this.startTimer();

            // Display first question
            this.displayQuestion();

        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('Failed to load questions from the API. Please check your internet connection and try again.');
            this.startQuizBtn.textContent = 'Start Quiz';
            this.startQuizBtn.disabled = false;
        }
    }

    async loadQuestions() {
        // Build API URL with user preferences
        let apiUrl = `https://opentdb.com/api.php?amount=${this.totalQuestions}`;
        
        if (this.difficulty !== 'any') {
            apiUrl += `&difficulty=${this.difficulty}`;
        }
        
        if (this.category !== 'any') {
            apiUrl += `&category=${this.category}`;
        }
        
        apiUrl += '&type=multiple';

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        if (data.response_code !== 0 || !data.results || data.results.length === 0) {
            throw new Error('No questions available from API');
        }
        
        // Process the API response
        this.questions = data.results.map(q => ({
            question: this.decodeHtmlEntities(q.question),
            options: [...q.incorrect_answers.map(this.decodeHtmlEntities), 
                     this.decodeHtmlEntities(q.correct_answer)].sort(() => Math.random() - 0.5),
            correctAnswer: this.decodeHtmlEntities(q.correct_answer),
            difficulty: q.difficulty,
            category: q.category
        }));
    }

    decodeHtmlEntities(text) {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    }

    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.endQuiz();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const hours = Math.floor(this.timeRemaining / 3600);
        const minutes = Math.floor((this.timeRemaining % 3600) / 60);
        const seconds = this.timeRemaining % 60;
        
        let timeString = '';
        if (hours > 0) {
            timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        this.timerElement.textContent = `Time: ${timeString}`;
        
        // Update timer color based on remaining time
        this.timerElement.classList.remove('warning', 'critical');
        if (this.timeRemaining <= 300) { // 5 minutes
            this.timerElement.classList.add('critical');
        } else if (this.timeRemaining <= 600) { // 10 minutes
            this.timerElement.classList.add('warning');
        }
        
        // Update progress bar
        const totalTime = this.timeLimit * 60;
        const progressPercentage = ((totalTime - this.timeRemaining) / totalTime) * 100;
        this.progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
    }

    displayQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endQuiz();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        this.questionText.textContent = question.question;
        this.questionCounter.textContent = `Question ${this.currentQuestionIndex + 1}/${this.questions.length}`;

        // Clear previous options
        this.optionsContainer.innerHTML = '';

        // Add new options
        question.options.forEach((option) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            if (this.userAnswers[this.currentQuestionIndex] === option) {
                optionElement.classList.add('selected');
            }
            optionElement.textContent = option;
            optionElement.addEventListener('click', () => this.selectOption(option));
            this.optionsContainer.appendChild(optionElement);
        });

        // Update navigation buttons
        this.prevBtn.style.display = this.currentQuestionIndex > 0 ? 'block' : 'none';
        this.nextBtn.textContent = this.currentQuestionIndex === this.questions.length - 1 ? 'Finish Quiz' : 'Next Question';
    }

    selectOption(selectedOption) {
        this.userAnswers[this.currentQuestionIndex] = selectedOption;
        
        // Update UI
        const options = this.optionsContainer.querySelectorAll('.option');
        options.forEach(option => {
            option.classList.remove('selected');
            if (option.textContent === selectedOption) {
                option.classList.add('selected');
            }
        });
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        // Save current answer
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        } else {
            this.endQuiz();
        }
    }

    endQuiz() {
        clearInterval(this.timerInterval);
        this.endTime = new Date();
        this.calculateScore();
        
        // Switch to results screen
        this.quizScreen.classList.remove('active');
        this.resultsScreen.classList.add('active');
        
        // Display results
        this.displayResults();
    }

    calculateScore() {
        this.score = 0;
        this.questions.forEach((question, index) => {
            if (this.userAnswers[index] === question.correctAnswer) {
                this.score++;
            }
        });
    }

    displayResults() {
        const totalQuestions = this.questions.length;
        const percentage = Math.round((this.score / totalQuestions) * 100);
        const timeTaken = Math.round((this.endTime - this.startTime) / 1000); // in seconds
        
        this.finalScore.textContent = `${this.score}/${totalQuestions}`;
        this.percentage.textContent = `${percentage}%`;
        this.totalQuestionsEl.textContent = totalQuestions;
        this.correctAnswers.textContent = this.score;
        this.timeTaken.textContent = this.formatTime(timeTaken);
        
        // Performance message
        let message = '';
        if (percentage >= 90) message = 'Outstanding! You\'re a quiz master!';
        else if (percentage >= 80) message = 'Excellent work! Very impressive!';
        else if (percentage >= 70) message = 'Great job! Well done!';
        else if (percentage >= 60) message = 'Good effort! Keep practicing!';
        else if (percentage >= 50) message = 'Not bad! You\'re getting there!';
        else message = 'Keep studying and try again! You can do it!';
        
        this.performanceMessage.textContent = message;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    reviewAnswers() {
        // Implement review functionality
        alert('Review functionality will be implemented in the next version!');
    }

    restartQuiz() {
        this.resultsScreen.classList.remove('active');
        this.setupScreen.classList.add('active');
        this.quizStarted = false;
        this.startQuizBtn.textContent = 'Start Quiz';
        this.startQuizBtn.disabled = false;
    }
}

// Initialize the quiz application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new QuizApplication();
});