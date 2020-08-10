const { desktopCapturer, remote } = require('electron')
const { Menu, dialog } = remote
const { writeFile } = require('fs')

let timer
let hours = 0,
    mins = 0,
    seconds = 0

// Global state
let mediaRecorder; // MainRecorder instance to capture footage
const recordedChunks = []

// Timer references
const hoursElem = document.getElementById('hours')
const minsElem = document.getElementById('mins')
const secondsElem = document.getElementById('seconds')



// Buttons reference
const videoElem = document.querySelector('video')
const startBtn = document.getElementById('startBtn')
const stopBtn = document.getElementById('stopBtn')
const videoSelectBtn = document.getElementById('videoSelectBtn')
videoSelectBtn.onclick = getVideoSources

const time = document.getElementById('time')


// Start video recording event handler
startBtn.onclick = e => {
    if (videoElem.srcObject) {
        mediaRecorder.start();
        startBtn.classList.add('is-danger');
        stopBtn.removeAttribute('disabled')
        startBtn.innerText = 'Recording...';
        startTimer()
    } else {
        dialog.showMessageBox({
            type: 'none',
            title: 'Error!',
            message: 'Please select the video recording source'
        });
    }
};

// Stop Video recording event handler
stopBtn.onclick = e => {
    mediaRecorder.stop()
    startBtn.classList.remove('is-danger');
    stopBtn.setAttribute('disabled', '')
    startBtn.innerText = 'Start';
    clearInterval(timer)
    hoursElem.innerText = '00:'
    minsElem.innerText = '00:'
    secondsElem.innerText = '00'
}

function startTimer() {
    timer = setInterval(() => {
        seconds++;
        if (seconds > 59) {
            seconds = 0;
            mins++;
            if (mins > 59) {
                mins = 0;
                hours++;
                if (hours < 10) {
                    hoursElem.innerText = '0' + hours + ':'
                }
                else hoursElem.innerText = hours + ':';
            }

            if (mins < 10) {
                minsElem.innerText = '0' + mins + ':';
            }
            else minsElem.innerText = mins + ':';
        }
        if (seconds < 10) {
            secondsElem.innerText = '0' + seconds;
        }
        else {
            secondsElem.innerText = seconds;
        }
    }, 1000);
}

// Get the available video sources
async function getVideoSources() {
    const inputSources = await desktopCapturer.getSources({
        types: ['window', 'screen']
    })
    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            }
        })
    )
    videoOptionsMenu.popup()
}


// change the source to record
async function selectSource(source) {
    videoSelectBtn.innerText = source.name

    const contraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    }

    // create a stream
    const stream = await navigator.mediaDevices.getUserMedia(contraints)

    // preview the source in a stream
    videoElem.srcObject = stream
    videoElem.play()

    // create the Media Recorder
    const options = { mimeType: 'video/webm; codecs=vp9' }
    mediaRecorder = new MediaRecorder(stream, options)
    console.log("mediaRecorder", mediaRecorder)
    // Register event handlers
    mediaRecorder.ondataavailable = handleDataAvailable
    mediaRecorder.onstop = handleStop
}


// Captures all recorder chunks
function handleDataAvailable(e) {
    console.log('video data available')
    recordedChunks.push(e.data)
}


// Saves the video file on stop
async function handleStop(e) {
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    })

    const buffer = Buffer.from(await blob.arrayBuffer())

    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save video',
        defaultPath: `video-${Date.now()}.webm`
    })

    if (filePath) {
        writeFile(filePath, buffer, () => console.log('Video file saved successfully!'))
    } else {
        console.error('Error: filepath not available')
    }
}