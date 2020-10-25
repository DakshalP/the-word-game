//Make connection
var socket = io.connect('https://the-word-game.herokuapp.com');
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
    instructions = document.getElementById('instructions'), 
    helpPrompt = document.getElementById('helpPrompt');

var peopleArr = [];
var numWords;
var name;
var id;
var amHost = false;

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

        clue.innerHTML = "<h3>Ask the host</h3> A clue has not been given to you yet. Ask the host to give you one. "
    }
})

give.addEventListener('click', ()=>{
    if(amHost) {
        if(confirm("Send word? Do this when everyone has joined.")) {
            socket.emit('giveClue', name);
        }
    } else {
        socket.emit('askHost');
    }
})

boardButton.addEventListener('click', () => { newBoard(16);})

instructions.addEventListener('click', ()=>{
    toggleModal();
})


//Listen for socket events
socket.on('connect', ()=>{
    console.log("Initial connection made.");
})

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

    if(amHost && peopleArr.length > 1) {
        helpPrompt.innerHTML = "A <strong> new person </strong> joined or reconnected. <br> Press <strong>give clues</strong> to get started. <br> (You are the host)"
        helpPrompt.style.display = "block";
    }
})

socket.on('removePerson', (person) => {
    peopleArr.splice(peopleArr.indexOf(person.name), 1)
    updateOutput();
})

socket.on('host', ()=>{
    /*changing this variable just tells you you're the host (who can give clues), 
    doesn't actually change the host for everyone.
    Prevents tampering.
    */
    amHost = true;
    give.style.display = "block";
    give.style.backgroundColor = "#30915a"
    helpPrompt.innerHTML = "You are the host! Press <strong>give clues</strong> to get started."
})

socket.on('removeHost', ()=>{
    console.log("You were removed as host.")
    amHost = false;
    give.style.display = "none";
    helpPrompt.innerHTML = "Ask the host to <strong>give out clues</strong> so that you can get started."
})

socket.on('askHost', (hostName)=>{
    if(hostName != null) { createAlertModal(`Ask the host, ${hostName}, to give the clue.`) }
    else {createAlertModal("Error, there is no host")}
})

socket.on('changeName', (namesObj)=>{
    if(peopleArr.includes(namesObj.previousName) && !(peopleArr.includes(namesObj.newName))) {
        peopleArr.splice(peopleArr.indexOf(namesObj.previousName), 1, namesObj.newName);
        updateOutput();
    }
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
        helpPrompt.style.display = "block";
        helpPrompt.innerHTML = "<strong>You reconnected!</strong> <br> Ask the host to give out clues again so you can join the game."
        if(typeof(name) != 'undefined') {
            //reconnect with name if name was entered before.
            socket.emit('connectAgain', {
                name: name,
                id: id
            });
        }
    })    
})
socket.on('giveClue', (data) =>{
    clue.innerHTML = (data.word === "?") ? `<h3>Clue ${data.clueNum}</h3> You're the one who <strong>doesn't know the word</strong>... don't tell anyone.` : `<h3>Clue ${data.clueNum}</h3> The word is at <strong>${data.word}</strong>`;
    helpPrompt.style.display = "none";
    toggleModal();
})
socket.on('changeBoard', (words)=>{
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

function changeHost(passphrase){
    socket.emit("changeHost", {passphrase: passphrase, name: name});
}

/* Modals */
//main clue modal
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

//extra dynamic modals


function createModal(content) {
    let modal = document.createElement('div');
    modal.classList.add('modal', 'show-modal')
    modal.innerHTML = 
        `
            <div class="modal-content">
                ${content}
            </div>
        `
    document.querySelector("body").appendChild(modal);
    return modal;
}

function createAlertModal(alertText, alertTitle) {
    const modalContent = 
    `
        ${(alertTitle) ? `<h3>${alertTitle}</h3>` : ''}
        <p>${alertText}</p>
        <div class="close-button">Ok</div>
    `
    let modal = createModal(modalContent);
    modal.getElementsByClassName('close-button')[0].addEventListener('click', ()=> {modal.remove();});
    window.addEventListener('click', (event) => {if(event.target === modal) modal.remove();});
}

function addWordLimit(wordLimit, promptModal, input) {
    let wordsDiv = promptModal.querySelector('#words-div')
    input.addEventListener('keydown', (e)=>{
        let words = [];
        if(input.value.trim() != '') words = input.value.trim().split(/\s+/);
        if(words.length < wordLimit) wordsDiv.innerHTML = `<h3>${words.length} out of ${wordLimit} words.</h3>`;
        else {
            wordsDiv.innerHTML = `<h3>${words.length} out of ${wordLimit} words.</h3>`
            //prevent new word additions
            if(e.code === "Space") input.maxLength = input.value.length;
            if(e.code === "Backspace") input.maxLength = 524288; //default max input length
        }
    })
}

function createPromptModal(question, buttonText, wordLimit = 0) {
    return new Promise((resolve, reject) => {
        const modalContent = 
        `
                <p>${question}</p>
                ${(wordLimit > 0) ? '<div id="words-div"></div>' : ''}
                <input type="text" name="reply">
                <div class="buttons">
                    <div class="close-button">${buttonText}</div>
                    <div class="canceling close-button">Cancel</div>
                </div>
        `
        let modal = createModal(modalContent);
        let input = modal.querySelector('input[name=reply]');

        let returnValue = () => {
            let reply = input.value;
            modal.remove();
            if(reply.trim() != '') resolve(reply)
            else reject("Please enter a value into the input.");
        }
        //on main button click return value
        modal.getElementsByClassName('close-button')[0].addEventListener('click', returnValue);
        //on cancel button or window click just remove the modal
        modal.getElementsByClassName('close-button')[1].addEventListener('click', () => {modal.remove();});
        window.addEventListener('click', (event) => {if(event.target === modal) modal.remove();});

        if(wordLimit > 0) addWordLimit(wordLimit, modal, input);
    })
}

async function newBoard(numWords) {
    try {
        let wordStr = await createPromptModal("Enter 16 words for the new board.", "Ok", numWords);
        let wordArr = wordStr.replaceAll(',', '').trim().split(' ');
        if(wordArr.length === numWords) socket.emit('changeBoard', wordArr);
        else createAlertModal("Less than 16 words entered", "Please try again");
    }
    catch(err) {
        createAlertModal(err, "Error");
    }
}
