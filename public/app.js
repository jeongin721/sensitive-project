document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const textInput = document.getElementById('text-input');
    const resultContainer = document.getElementById('result-container');
    const errorBox = document.getElementById('error-box');
    const errorMessage = document.getElementById('error-message');
    
    const sentimentValue = document.getElementById('sentiment-value');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceText = document.getElementById('confidence-text');
    const reasonText = document.getElementById('reason-text');

    const sentimentMap = {
        'positive': '긍정',
        'negative': '부정',
        'neutral': '중립'
    };

    analyzeBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();

        // 초기화
        errorBox.classList.add('hidden');
        resultContainer.classList.add('hidden');

        // 검증
        if (!text) {
            showError('텍스트를 입력해주세요.');
            return;
        }

        // 로딩 상태
        setLoading(true);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 중 오류가 발생했습니다.');
            }

            displayResult(data);
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = '분석 중...';
            textInput.disabled = true;
        } else {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '분석하기';
            textInput.disabled = false;
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function displayResult(data) {
        const sentiment = sentimentMap[data.sentiment] || '알 수 없음';
        sentimentValue.textContent = sentiment;
        
        // 색상 변경 (선택 사항)
        if (data.sentiment === 'positive') sentimentValue.style.color = '#fff176';
        else if (data.sentiment === 'negative') sentimentValue.style.color = '#ff6b6b';
        else sentimentValue.style.color = '#ffffff';

        confidenceText.textContent = `${data.confidence}%`;
        confidenceBar.style.width = `${data.confidence}%`;
        reasonText.textContent = data.reason;

        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
});
