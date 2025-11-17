import Chart from 'chart.js/auto';
import mongoose from 'mongoose';
import http from 'http';
const PORT = 3000;
import { WebSocketServer } from 'ws';
let wss = new WebSocketServer({port: 80});

wss.on('connection', function(ws){
    console.log("web socket client conected");
    ws.on('message', function(message){
        console.log(message)
        console.log(message.toString('ascii'))
    });
});
console.log('initializing WebSocket');

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/test');

    const questionSchema = new mongoose.Schema({
        question: String,
        A: String,
        B: String,
        C: String,
        D: String,
        expected_response: String,
        chatgpt_response: String,
        domain: String,
        expected_response: Number,
        response_time: Number,
    });

    const Question = mongoose.model('chatgpt_evaluation_questions', questionSchema);

    var compQuestions = await Question.find({domain: 'computer_security'}).limit(50);
    var historyQuestions = await Question.find({domain: 'prehistory'}).limit(50);
    var sociologyQuestions = await Question.find({domain: 'sociology'}).limit(50);
    var compQuestions = askGpt(compQuestions);
    var historyQuestions = askGpt(historyQuestions);
    var sociologyQuestions = askGpt(sociologyQuestions);
    makeChart(compQuestions, historyQuestions, sociologyQuestions);
}

function makeChart(compQuestions, historyQuestions, sociologyQuestions){
    // var compScore, compAvg = evaluate(compQuestions);
    // var historyScore, historyAvg = evaluate(historyQuestions);
    // var sociologyScore, sociologyAvg = evaluate(sociologyQuestions);
    // var ctx = document.getElementById('myChart');

    // var compData = [];
    // var histData = [];
    // var soscData = [];

    // new Chart(ctx, {
    //     type: 'bar',
    //     data: {
    //     labels: ['Computer Science', 'History', 'Social Science'],
    //     datasets: [{
    //         label: 'Accuracy',
    //         data: [compScore, historyScore, sociologyScore],
    //         borderWidth: 1
    //     }]
    //     },
    //     options: {
    //     scales: {
    //         y: {
    //         beginAtZero: true
    //         }
    //     }
    //     }
    // });
}

function askGpt(questions){
    for(let i = 0; i < 50; i++){
        let currentQ = questions[i];
        let gptPrompt = currentQ.question + " A." + currentQ.A + " B. " + currentQ.B + " C. " + currentQ.C + " D. " + currentQ.D;
        //ask chatGPT with prompt, store response and response time
    }
    return questions;
}

function evaluate(questions){
    let score = 0
    let avg = 0;
    for(let i = 0; i < 50; i++){
        let currentQ = questions[i];
        if(currentQ.expected_response == currentQ.chatgpt_response)
            score++;
        avg += currentQ.response_time;
    }
    return score, avg;
}

const server = http.createServer((req, res) =>{
    res.end(message);
});

server.listen(PORT, () => {
    console.log('Server running on ws://localhost:' + PORT);
});