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

    // Click to upload
    uploadBox.addEventListener('click', () => {
        imageUpload.click();
    });

    // Drag and drop functionality
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

    // File selection
    imageUpload.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Handle uploaded files
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) { // Ensure it's an image file
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

    // Analyze button functionality
    analyzeBtn.addEventListener('click', () => {
        const file = imageUpload.files[0];

        if (!file) {
            alert("Please upload an image first!");
            return;
        }

        // Prepare the file for the Flask API
        const formData = new FormData();
        formData.append('image', file);

        // Show loading state
        resultSection.classList.remove('hidden');
        diseaseType.textContent = "Analyzing...";
        diseaseDescription.textContent = "Please wait while we process the image...";
        recommendations.innerHTML = "";

        // Determine the API URL
        const isProduction = window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost";
        const apiUrl = isProduction
            ? "https://plantguard-dtsq.onrender.com/predict"
            : "http://192.168.1.8:5000/predict";

        // Fetch API call
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

                    diseaseType.textContent = `${result.icon} ${data.prediction}`;
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
                diseaseType.textContent = "Error";
                diseaseDescription.textContent = "An error occurred while processing the image.";
            });
    });

    // Remove Image button functionality
    removeImageBtn.addEventListener('click', () => {
        uploadedImage.classList.add('hidden');
        analyzeBtn.classList.add('hidden');
        removeImageBtn.classList.add('hidden');
        resultSection.classList.add('hidden');
        imageUpload.value = ""; // Clear the file input
    });
});
