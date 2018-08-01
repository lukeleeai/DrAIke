// video & result vars
var display_score = document.getElementById('score');
var video = document.getElementById('result_video');
var score = localStorage.getItem('score');
var videos = ['Above 90', 'Ending80to90', 'Ending60to80', 'Ending40to60', 'EndingBelow40'];


// autoScrolling vars
var fps = 100;
var speedFactor = 0.04;
var minDelta = 0.5;
var autoScrollSpeed = 30;
var autoScrollTimer, restartTimer;
var isScrolling = false;
var prevPos = 0, currentPos = 0;
var currentTime, prevTime, timeDiff;
var isEnd = false; 


window.addEventListener("scroll", function (e) {
    // window.pageYOffset is the fallback value for IE
    currentPos = window.scrollY || window.pageYOffset;
});

window.addEventListener("wheel", handleManualScroll);
window.addEventListener("touchmove", handleManualScroll);

function handleManualScroll() {
    // window.pageYOffset is the fallback value for IE
    currentPos = window.scrollY || window.pageYOffset;
    clearInterval(autoScrollTimer);
    if (restartTimer) {
        clearTimeout(restartTimer);
    }
    restartTimer = setTimeout(() => {
        prevTime = null;
        setAutoScroll();
    }, 50);
}

function setAutoScroll(newValue) {
    if (isEnd) {
        return;
    }
    if (newValue) {
        autoScrollSpeed = speedFactor * newValue;
    }
    if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
    }
    autoScrollTimer = setInterval(function(){
        currentTime = Date.now();
        if (prevTime) {
            if (!isScrolling) {
                timeDiff = currentTime - prevTime;
                currentPos += autoScrollSpeed * timeDiff;
                if (Math.abs(currentPos - prevPos) >= minDelta) {
                    isScrolling = true;
                    window.scrollTo(0, currentPos);
                    isScrolling = false;
                    prevPos = currentPos;
                    prevTime = currentTime;
                }
            }
        } else {
            prevTime = currentTime;
        }
    }, 1000 / fps);
    isEnd = true;
}

function setVideo(){
    video.style.display = 'block';
    
    if (score > 90) {
        video.src = '../videos/' + videos[0] + '.mp4'; 
    } else if (80 <= score) {
        video.src = '../videos/' + videos[1] + '.mp4';
    } else if (60 <= score) {
        video.src = '../videos/' + videos[2] + '.mp4';
    } else if (40 <= score) {
        video.src = '../videos/' + videos[3] + '.mp4';
    } else {
        video.src = '../videos/' + videos[4] + '.mp4';
    }
}

// display score here. 

setVideo();
display_score.innerHTML = '1'
setTimeout(function(){display_score.innerHTML = '2'; display_score.style.fontSize = "100px"}, 1000)
setTimeout(function(){display_score.innerHTML = '3'; display_score.style.fontSize = "200px"}, 2000)
setTimeout(function(){display_score.innerHTML = score; display_score.style.fontSize = "400px"}, 3000)
setTimeout(function(){setAutoScroll(20);}, 5000)
setTimeout(function(){video.play();}, 5800)


