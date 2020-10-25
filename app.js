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
    if(!(connectedArr.find(obj => obj.id === id))){
        if(name === hostName) {
            name += " <em>(Host)</em>"
        }                                                                                                                                                                                                                                                          
        connectedArr.push(
            {
                name: name,
                id: id
            }
        )
        console.log('ADD', name)
        console.log(connectedArr)
        io.sockets.emit('addPerson', name);
    } else {
        console.log(name, 'already exists.')
    }
}

//Socket setup
var io = socket(server);
var connectedArr = [];
var previousBoard;
var clueNum = 100;
var hostName;
var hostID;

io.on('connection', (socket)=>{
    console.log('made socket connection: ', socket.id);
    
    socket.emit('refreshLobby', connectedArr);
    if(previousBoard != null) socket.emit('changeBoard', previousBoard);
    socket.emit('changeName', {
        previousName: hostName,
        newName: `${hostName} <em>(Host)</em>`
    })

    /* 
    This is a flaw that needs to be fixed.
    The app doesn't require users to make their own unique username, so instead it sends them an id to use as unique.
    Should be fixed with unique usernames.
    */
    socket.emit('giveID', socket.id);

    //handle events
    socket.on('addPerson', (name) => {
        //the first player to join can give the clues
        if(connectedArr.length < 1) {
            socket.emit('host');
            hostName = name;
            hostID = socket.id;
        }
        addPerson(name, socket.id);
    });

    socket.on('giveClue', (name)=>{
        if(name === hostName) {
            generateRoleArr(connectedArr.length);
            clueNum++;
            for(let i=0;i<connectedArr.length;i++) {  
                io.to(`${connectedArr[i].id}`).emit('giveClue', {word: roleArr[i], clueNum: clueNum})
            }
        } else {
            socket.emit("askHost", hostName)
        }
    })

    socket.on('askHost', ()=>{
        socket.emit('askHost', hostName)
    })

    socket.on('disconnect', ()=> {
        console.log('Got disconnect!: ', socket.id);
  
        let index = connectedArr.map(obj => obj.id).indexOf(socket.id);
        if(index != -1) {
            console.log("REMOVE : " ,connectedArr[index].name);
            io.sockets.emit('removePerson', connectedArr[index]);
            connectedArr.splice(index, 1);
            console.log(connectedArr);
        }

        //if host disconnects, move onto the next person and make them the host.
        if (socket.id === hostID) {
            if(typeof(connectedArr[0]) != "undefined") {
                console.log('NEW HOST', connectedArr[0].name)
                io.to(`${connectedArr[0].id}`).emit('host');
                hostName = connectedArr[0].name;
                hostID = connectedArr[0].id;
                io.sockets.emit('changeName', {
                    previousName: connectedArr[0].name,
                    newName: `${connectedArr[0].name} <em>(Host)</em>`
                })
            }
        }
    });


    // this can be simplified through the use of unique usernames, see above.
    socket.on('connectAgain', (client)=>{
        if(connectedArr.find(obj => obj.id === client.id)) {
            //if already in connectedArr, replace
            connectedArr.splice(connectedArr.map(obj => obj.id).indexOf(client.id), 1, {name: client.name, id: socket.id})
            socket.emit('refreshLobby', connectedArr);
        }else {
            //else add a new person back into connectedArr
            if(connectedArr.length < 1) {
                socket.emit('host');
                hostName = client.name;
                hostID = socket.id;
            }
            addPerson(client.name, socket.id);
        }
    })
    

    socket.on('changeBoard', (boardWords)=>{
        previousBoard = boardWords;
        io.sockets.emit('changeBoard', boardWords);
    })

    socket.on('changeHost', (obj) => {
        if(obj.passphrase === "secret2020") {
            io.sockets.emit('changeName', {
                previousName: `${hostName} <em>(Host)</em>`,
                newName: hostName
            })
            console.log("Remove host", hostID, connectedArr)
            io.to(`${hostID}`).emit('removeHost');

            console.log('NEW HOST', obj.name)
            io.to(`${socket.id}`).emit('host');
            hostName = obj.name;
            hostID = socket.id;
            io.sockets.emit('changeName', {
                previousName: obj.name,
                newName: `${obj.name} <em>(Host)</em>`
            })
        }
    })
})