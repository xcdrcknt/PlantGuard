document.addEventListener('DOMContentLoaded', () => {
    const uploadBox = document.getElementById('uploadBox');
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImage = document.getElementById('uploadedImage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const resultSection = document.getElementById('resultSection');
    const diseaseType = document.getElementById('diseaseType');
    const diseaseDescription = document.getElementById('diseaseDescription');
    const recommendations = document.getElementById('recommendations');

    const maxRetries = 3; // Maximum number of retries
    const retryDelay = 2000; // Delay between retries in milliseconds

    uploadBox.addEventListener('click', () => {
        imageUpload.click();
    });

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    imageUpload.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImage.src = e.target.result;
                    uploadedImage.classList.remove('hidden');
                    analyzeBtn.classList.remove('hidden');
                    removeImageBtn.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        }
    }

    analyzeBtn.addEventListener('click', () => {
        const file = imageUpload.files[0];

        if (!file) {
            alert("Please upload an image first!");
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        resultSection.classList.remove('hidden');
        diseaseType.textContent = "Analyzing...";
        diseaseDescription.textContent = "Please wait while we process the image...";
        recommendations.innerHTML = "";

        const isProduction = window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost";
        const apiUrl = isProduction
            ? "https://plantguard-dtsq.onrender.com/predict"
            : "http://192.168.1.8:5000/predict";

        // Retry mechanism
        let attempt = 0;

        function sendRequest() {
            attempt++;
            console.log(`Attempt ${attempt} to analyze the image...`);

            fetch(apiUrl, {
                method: "POST",
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.prediction === "Invalid Image") {
                        diseaseType.textContent = "Invalid Image";
                        diseaseDescription.textContent = "The uploaded image does not appear to be a plant.";
                        recommendations.innerHTML = "";
                    } else {
                        const results = {
                            'Healthy': {
                                icon: '🌿',
                                description: 'Your plant looks healthy and shows no signs of disease.',
                                recommendations: [
                                    'Continue your current care routine.',
                                    'Maintain good watering and sunlight practices.',
                                    'Monitor the plant for any changes.'
                                ]
                            },
                            'Powdery': {
                                icon: '🍄',
                                description: 'Your plant is affected by Powdery Mildew, a common fungal disease.',
                                recommendations: [
                                    'Improve air circulation around the plant.',
                                    'Reduce humidity and avoid overhead watering.',
                                    'Use fungicide specifically for powdery mildew.'
                                ]
                            },
                            'Rust': {
                                icon: '🦠',
                                description: 'Your plant shows signs of Rust, a fungal plant disease.',
                                recommendations: [
                                    'Remove and destroy infected plant parts.',
                                    'Apply appropriate fungicide.',
                                    'Avoid wetting leaves when watering.'
                                ]
                            }
                        };

                        const result = results[data.prediction];
                        diseaseType.textContent = data.prediction;
                        diseaseDescription.textContent = result.description;

                        recommendations.innerHTML = "";
                        result.recommendations.forEach(rec => {
                            const p = document.createElement('p');
                            p.textContent = `• ${rec}`;
                            recommendations.appendChild(p);
                        });
                    }
                })
                .catch(error => {
                    console.error("Error:", error);
                    if (attempt < maxRetries) {
                        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
                        setTimeout(sendRequest, retryDelay); // Retry after delay
                    } else {
                        diseaseType.textContent = "Error";
                        diseaseDescription.textContent = "An error occurred while processing the image.";
                    }
                });
        }

        sendRequest(); // Initial request
    });

    removeImageBtn.addEventListener('click', () => {
        uploadedImage.classList.add('hidden');
        analyzeBtn.classList.add('hidden');
        removeImageBtn.classList.add('hidden');
        resultSection.classList.add('hidden');
        imageUpload.value = "";
    });
});
