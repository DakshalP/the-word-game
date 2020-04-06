//Make connection
var socket = io.connect('https://the-word-game.herokuapp.com/');

//Query DOM
const join = document.getElementById('join'),
    namePrompt = document.getElementById('name'),
    people = document.getElementById('people'),
    output = document.getElementById('output'),
    input = document.getElementById('input'),
    controls = document.getElementById('controls'),
    tagline = document.getElementById('tagline'),
    boardButton = document.getElementById('boardButton'),
    board = document.getElementById('board'),
    give = document.getElementById('give'),
    clue = document.getElementById('clue'),
    instructions = document.getElementById('instructions');

var peopleArr = [];
var numWords;
var clueNum = 0;
var name;
var id;

//quick title case
// function toTitleCase(str) {
//     return str.replace(
//         /\w\S*/g,
//         function(txt) {
//             return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
//         }
//     );
// }

function updateOutput() {
    console.log(peopleArr);
    output.innerHTML = "";
    peopleArr.forEach(person => {
        output.innerHTML += `<p>${person}</p>`;
    });
    //scroll down
    people.scrollTop = people.scrollHeight;
}

//DOM events
join.addEventListener('click', ()=> {
    if(namePrompt.value.trim() != "") {
        name = namePrompt.value;
        socket.emit('addPerson', namePrompt.value);
        namePrompt.value = "";

        tagline.innerText="You're in! Do you see your name?"
        input.innerHTML="";
        controls.style.display = "block";
        people.style.height = "250px";

        clue.innerText = "The clues have not been given yet."
    }
})

give.addEventListener('click', ()=>{
    if(confirm("Send word? Do this when everyone has joined.")) {
        socket.emit('giveWord');
    }
})

boardButton.addEventListener('click', ()=>{
    if(confirm("Are you sure you want to change the board?")) {
        var boardWords = prompt("Enter 16 words seperated by a comma.");
        
        //this version allows for any number of words on board
        // if(boardWords.trim() != "") {   
        //     socket.emit('changeBoard', boardWords);
        // }

        //check if enough commas for 16 words
        if([15,16].includes(boardWords.split(',').length-1)) {
            socket.emit('changeBoard', boardWords);
        } else {
            alert('Sorry, 16 words seperated by a comma each were not detected');
        }
    }
})

instructions.addEventListener('click', ()=>{
    toggleModal();
})


//Listen for socket events
socket.on('refreshLobby', (arr) =>{
    peopleArr = [];
    arr.forEach(person => {
        peopleArr.push(person.name);
    });
    updateOutput();
})
socket.on('giveID', (socketID)=>{
    id = socketID;
})
socket.on('addPerson', (person)=>{
    peopleArr.push(person);
    updateOutput();
    //scroll down
    people.scrollTop = people.scrollHeight;
})
socket.on('removePerson', (person) => {
    peopleArr.splice(peopleArr.indexOf(person.name), 1)
    updateOutput();
})
socket.on('disconnect', ()=>{
    tagline.innerText = "Disconnected from the game... "
    if(typeof(name) != 'undefined') {
        //remove own name from connected people now that the server can't do that
        peopleArr.splice(peopleArr.indexOf(name), 1)
        updateOutput();
    }

    socket.on('reconnecting', ()=>{
        tagline.innerText = "Disconnected from the game... reconnecting."
    })

    socket.on('reconnect', ()=>{
        tagline.innerText = "Reconnected to the game!"
        if(typeof(name) != 'undefined') {
            //reconnect with name if name was entered before.
            socket.emit('connectAgain', {
                name: name,
                id: id
            });
        }
    })    
})
socket.on('giveWord', (word) =>{
    clueNum++;
    clue.innerHTML = (word === "?") ? `<h3>Clue ${clueNum}</h3> You're the one who <strong>doesn't know the word</strong>... don't tell anyone.` : `<h3>Clue ${clueNum}</h3> The word is at <strong>${word}</strong>`;
    toggleModal();
})
socket.on('changeBoard', (boardWords)=>{
    let words = boardWords.split(',')
    numWords = words.length;

    //group in groups of 4
    let groupWords = []
    while(words.length) {
        groupWords.push(words.splice(0,4));
    }

    //add <td> tags and push back into words
    words = []
    groupWords.forEach((arr)=> {
        words.push(arr.map(x => `<td>${x.trim()}</td>`))
    })

    //edit button
    boardButton.innerText = "Change board";

    //fill in to table
    board.innerHTML = 
    `
        <table>
            <tr>
                <th></th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
                <th>D</th>
            </tr>
            <tr>
                <th>1</th>
                ${(words[0]) ? words[0].toString().replace(/,/g,'\n') : ""}
            </tr>
            <tr>
                <th>2</th>
                ${(words[1]) ? words[1].toString().replace(/,/g,'\n') : ""}
            </tr>
            <tr>
                <th>3</th>
                ${(words[2]) ? words[2].toString().replace(/,/g,'\n') : ""}
            </tr>
            <tr>
                <th>4</th>
                ${(words[3]) ? words[3].toString().replace(/,/g,'\n') : ""}
            </tr>
        </table>
    `  
})

/* Modal */
const modal = document.querySelector(".modal");
const trigger = document.querySelector("#trigger");
const closeButton = document.querySelector(".close-button");
function toggleModal() {
    modal.classList.toggle("show-modal");
}
function windowOnClick(event) {
    if (event.target === modal) {
        toggleModal();
    }
}
trigger.addEventListener("click", toggleModal);
closeButton.addEventListener("click", toggleModal);
window.addEventListener("click", windowOnClick);

//random 6 digit hex id
// function randomId() {
//     return (Math.random()*0xFFFFFF<<0).toString(16);
// }

