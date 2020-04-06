var express = require('express');
var socket = require('socket.io')

// App setup
var app = express();

app.use(express.static('public'))

app.get('/', function(req,res) {
    res.sendFile('/index.html');
})

app.get('/board', function(req,res) {
    res.sendFile(__dirname + '/public/board.html');
})

var server = app.listen(process.env.PORT || 8080, () => {
    console.log('App listening on port ' + server.address().port)
})


function searchId(nameKey, myArray){
    for (var i=0; i < myArray.length; i++) {
        if (myArray[i].id === nameKey) {
            return i;
        }
    }
}

//random word id generation, each role is put into roleArr when generateRoleArr() is called
let roleArr = []
let lengthOfBoard = 4; //only length so far

function generateRoleArr(numPlayers) {
    roleArr = ["?"]
    let wordCode = randLetters(1) + (Math.floor(Math.random() * lengthOfBoard) + 1).toString();
    //-1 since the unknown word is already in the array "?"  
    for(i=0;i<numPlayers-1;i++) {
        roleArr.push(wordCode)
    }
    shuffleArr(roleArr);
}

function shuffleArr(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
}

function randLetters(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = lengthOfBoard;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

function addPerson(name, id) {
    connectedArr.push(
        {
            name: name,
            id: id
        }
    )
    console.log(connectedArr)
    io.sockets.emit('addPerson', name);
}

//Socket setup
var io = socket(server);
var connectedArr = [];
var previousBoard;

io.on('connection', (socket)=>{
    console.log('made socket connection: ', socket.id);
    socket.emit('refreshLobby', connectedArr);
    socket.emit('giveID', socket.id);
    if(previousBoard != null) socket.emit('changeBoard', previousBoard);

    //handle events
    socket.on('addPerson', (name) => {
        addPerson(name, socket.id);
    });

    socket.on('giveWord', ()=>{
        generateRoleArr(connectedArr.length);
        for(let i=0;i<connectedArr.length;i++) {  
            io.to(`${connectedArr[i].id}`).emit('giveWord', roleArr[i])
        }
    })

    socket.on('disconnect', ()=> {
        console.log('Got disconnect!: ', socket.id);
  
        let id = searchId(socket.id, connectedArr);
        if(typeof id !== "undefined") {
            console.log("REMOVE : " ,connectedArr[id].name);
            io.sockets.emit('removePerson', connectedArr[id]);
            connectedArr.splice(id, 1);
        }
    });

    socket.on('connectAgain', (client)=>{
        if(connectedArr.find(obj => obj.id === client.id)) {
            //if already in connectedArr, just refresh   
            socket.emit('refreshLobby', connectedArr);
        }else {
            //else add the person back into connectedArr
            addPerson(client.name, client.id);
        }
    })

    socket.on('changeBoard', (boardWords)=>{
        previousBoard = boardWords;
        io.sockets.emit('changeBoard', boardWords);
    })
})