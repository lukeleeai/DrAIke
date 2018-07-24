/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licnses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
// import dat from 'dat.gui';
// import Stats from 'stats.js';
// import * as posenet from '../src';

// import { drawKeypoints, drawSkeleton } from './demo_util';

var array = [-0.6005329032506525, -0.9598879756470423, -0.5795117263750041, -0.9919167341017759, -0.6409182388058764, -1, -0.5557016367202336, -0.97588875044832, -0.6695768773288382, -0.9584791914210189, -0.4706340393268988, -0.8351767525430345, -0.7184480578586234, -0.8327953269681089, -0.4061733469179349, -0.6440225807432703, -0.7599185332656984, -0.6646237882086984, -0.38394813166035385, -0.4956597540713707, -0.791327168537808, -0.5580297212140943, -0.512198579148671, -0.4893295394956854, -0.656096392293348, -0.48505491197068307, -0.525506959602403, -0.25623460801074677, -0.6221485034076731, -0.2553370831249129, -0.49900063420245966, -0.02926443922872809, -0.6085204010606226, 0, 0.9912254214286804, 0.9789207577705383, 0.9861181974411011, 0.7868602871894836, 0.7944118976593018, 0.9978253841400146, 0.9979249835014343, 0.9942077398300171, 0.9878455996513367, 0.9915287494659424, 0.9683718085289001, 0.9982691407203674, 0.9993439316749573, 0.9979090690612793, 0.9973910450935364, 0.9691821932792664, 0.9771260023117065, 16.414462208747864];
const maxVideoSize = 500;
const canvasSize = 500;
const stats = new Stats();

var poseVectors = [];

const similarity = require('compute-cosine-similarity');



function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  const video = document.getElementById('video');
  video.width = 500;
  video.height = 416;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const mobile = isMobile();
    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user',
        width: mobile ? undefined : 500,
        height: mobile ? undefined: 416}
    });
    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  } else {
    const errorMessage = "This browser does not support video capture, or this device does not have a camera";
    alert(errorMessage);
    return Promise.reject(errorMessage);
  }
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const guiState = {
  algorithm: 'single-pose',
  input: {
    mobileNetArchitecture: isMobile() ? '0.50' : '1.01',
    outputStride: 16,
    imageScaleFactor: 0.5,
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 2,
    minPoseConfidence: 0.1,
    minPartConfidence: 0.3,
    nmsRadius: 20.0,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
  },
  net: null,
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const cameraOptions = cameras.reduce((result, { label, deviceId }) => {
    result[label] = deviceId;
    return result;
  }, {});
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic happens.
 * This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const flipHorizontal = true; // since images are being fed from a webcam

  canvas.width = 500;
  canvas.height = 416;

  async function poseDetectionFrame() {

    // Begin monitoring code for frames per second
    stats.begin();

    const imageScaleFactor = 0.5;
    const outputStride = 16;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await guiState.net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);
        poseVector = poseToVector(poses);

        console.log('weighted: ', weightedDistanceMatching(poseVector, array));
        // console.log(poseVector)
        console.log('cosine: ', cosineDistanceMatching(poseVector, array))

        minPoseConfidence = Number(
          guiState.singlePoseDetection.minPoseConfidence);
        minPartConfidence = Number(
          guiState.singlePoseDetection.minPartConfidence);
        break;
    }

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvasSize, 0);
      ctx.drawImage(video, 0, 0, canvasSize, canvasSize);
      ctx.restore();
    }

    const scale = canvasSize / video.width;

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores

    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx, scale);
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, ctx, scale);
        }
      }
    });

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function normalizePose(poseVector, max, min){
  for(var i=0; i<poseVector.length; i++){
    poseVector[i] = (poseVector[i] - max) / (max - min)
  }
  return poseVector;
}

// function poseToVector(poses){
//   var poseVector = []
//   var confidenceSum = 0;
//   poses.forEach(({keypoints}) => {
//     keypoints.forEach(({score, position}) => {
//       poseVector.push(position.x);
//       poseVector.push(position.y);
//       poseVector.push(score);
//       confidenceSum += score;
//     })
//   })
//   poseVector.push(confidenceSum)
//   return poseVector
// }

function poseToVector(poses){
  var poseVector = []
  var confidenceSum = 0;
  max = -1000;
  min = 1000;
  // we have to normalize positions. So put aside confidence scores for later. 
  poses.forEach(({keypoints}) => {
    keypoints.forEach(({position}) => {
      poseVector.push(position.x);
      poseVector.push(position.y);
      max = Math.max(max, position.x, position.y)
      min = Math.min(min, position.x, position.y)
    })
  })
  // now we have an array for positions in a pose. let's normalize it now. 
  poseVector = normalizePose(poseVector, max, min)

  // now put confidence scores here. 
  poses.forEach(({keypoints}) => {
    keypoints.forEach(({score}) => {
      poseVector.push(score);
      confidenceSum += score;
    })
  })

  poseVector.push(confidenceSum)

  console.log('max: ', max)
  return poseVector
}

function cosineDistanceMatching(poseVector1, poseVector2) {
  let cosineSimilarity = similarity(poseVector1, poseVector2);
  let distance = 2 * (1 - cosineSimilarity);
  return Math.sqrt(distance);
}

function weightedDistanceMatching(poseVector1, poseVector2) {
  let vector1PoseXY = poseVector1.slice(0, 34);
  let vector1Confidences = poseVector1.slice(34, 51);
  let vector1ConfidenceSum = poseVector1.slice(51, 52);

  let vector2PoseXY = poseVector2.slice(0, 34);

  // First summation
  let summation1 = 1 / vector1ConfidenceSum;

  // Second summation
  let summation2 = 0;
  for (let i = 0; i < vector1PoseXY.length; i++) {
    let tempConf = Math.floor(i / 2);
    let tempSum = vector1Confidences[tempConf] * Math.abs(vector1PoseXY[i] - vector2PoseXY[i]);
    summation2 = summation2 + tempSum;
  }

  return summation1 * summation2;
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading available
 * camera devices, and setting off the detectPoseInRealTime function.
 */
async function bindPage() {
  // Load the PoseNet model weights for version 1.01
  const net = await posenet.load(0.75);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  let video;

  try {
    video = await loadVideo();
  } catch(e) {
    console.error(e);
    return;
  }

  setupGui([], net);
  setupFPS();
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
bindPage(); // kick off the demo