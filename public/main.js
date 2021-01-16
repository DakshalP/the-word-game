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
    while(output.firstChild) {output.removeChild(output.firstChild)}
    peopleArr.forEach((person) => {
        let p = document.createElement('p');
        p.innerText = person;
        output.appendChild(p);
    });
    //scroll down
    people.scrollTop = people.scrollHeight;
}

//DOM events
join.addEventListener('click', () => {
    if (namePrompt.value.trim() != '') {
        name = namePrompt.value;
        socket.emit('addPerson', namePrompt.value);
        namePrompt.value = '';

        tagline.innerText = "You're in! Do you see your name?";
        input.innerText = '';
        controls.style.display = 'block';
        people.style.height = '250px';

        while(clue.firstChild) {clue.removeChild(clue.firstChild)}
        clue.innerText =
            ' A clue has not been given to you yet. Ask the host to give you one. ';
    }
});

give.addEventListener('click', async () => {
    try {
        if (amHost) {
            if (
                await createConfirmModal(
                    'Give a clue?',
                    'Give clues only when everyone has joined.'
                )
            )
                socket.emit('giveClue', name);
        } else socket.emit('askHost');
    } catch (err) {
        console.log(err);
    }
});

boardButton.addEventListener('click', () => {
    newBoard(16);
});

instructions.addEventListener('click', () => {
    toggleModal();
});

//Listen for socket events
socket.on('connect', () => {
    console.log('Initial connection made.');
});

socket.on('refreshLobby', (arr) => {
    peopleArr = [];
    arr.forEach((person) => {
        peopleArr.push(person.name);
    });
    updateOutput();
});

socket.on('giveID', (socketID) => {
    id = socketID;
});

socket.on('addPerson', (person) => {
    peopleArr.push(person);
    updateOutput();
    //scroll down
    people.scrollTop = people.scrollHeight;

    if (amHost && peopleArr.length > 1) {
        helpPrompt.innerText =
            'A new person joined or reconnected. \n Press give clues to get started. \n (You are the host)';
        helpPrompt.style.display = 'block';
    }
});

socket.on('removePerson', (person) => {
    peopleArr.splice(peopleArr.indexOf(person.name), 1);
    updateOutput();
});

socket.on('host', () => {
    /*changing this variable just tells you you're the host (who can give clues), 
    doesn't actually change the host for everyone.
    Prevents tampering.
    */
    amHost = true;
    give.style.display = 'block';
    give.style.backgroundColor = '#30915a';
    helpPrompt.innerText =
        'You are the host! Press give clues to get started.';
});

socket.on('removeHost', () => {
    console.log('You were removed as host.');
    amHost = false;
    give.style.display = 'none';
    helpPrompt.innerText =
        'Ask the host to give out clues so that you can get started.';
});

socket.on('askHost', (hostName) => {
    if (hostName != null) {
        createAlertModal(`Ask the host, ${hostName}, to give the clue.`);
    } else {
        createAlertModal('Error, there is no host');
    }
});

socket.on('changeName', (namesObj) => {
    if (
        peopleArr.includes(namesObj.previousName) &&
        !peopleArr.includes(namesObj.newName)
    ) {
        peopleArr.splice(
            peopleArr.indexOf(namesObj.previousName),
            1,
            namesObj.newName
        );
        updateOutput();
    }
});

socket.on('disconnect', () => {
    tagline.innerText = 'Disconnected from the game... ';
    if (typeof name != 'undefined') {
        //remove own name from connected people now that the server can't do that
        peopleArr.splice(peopleArr.indexOf(name), 1);
        updateOutput();
    }

    socket.on('reconnecting', () => {
        tagline.innerText = 'Disconnected from the game... reconnecting.';
    });

    socket.on('reconnect', () => {
        tagline.innerText = 'Reconnected to the game!';
        helpPrompt.style.display = 'block';
        helpPrompt.innerText =
            'You reconnected! \n Ask the host to give out clues again so you can join the game.';
        if (typeof name != 'undefined') {
            //reconnect with name if name was entered before.
            socket.emit('connectAgain', {
                name: name,
                id: id,
            });
        }
    });
});
socket.on('giveClue', (data) => {
    while(clue.firstChild) {clue.removeChild(clue.firstChild)}
    let title = document.createElement('h3')
    let text = document.createElement('p');
    title.innerText = `CLUE ${data.clueNum}`;
    text.innerText = (data.word === '?') ? `You're the one who doesn't know the word... don't tell anyone.`: `The word is at ${data.word}`
    clue.appendChild(title)
    clue.appendChild(text)

    helpPrompt.style.display = 'none';
    toggleModal();
});
socket.on('changeBoard', (words) => {
    numWords = words.length;

    //group in groups of 4
    let groupWords = [];
    while (words.length) {
        groupWords.push(words.splice(0, 4));
    }

    //add <td> tags and push back into words
    words = [];
    groupWords.forEach((arr) => {
        words.push(arr.map((x) => `<td>${x.trim().replace(/<|>/g, '')}</td>`));
    });

    //edit button
    boardButton.innerText = 'Change board';

    //fill in to table
    board.innerHTML = `
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
                ${words[0] ? words[0].toString().replace(/,/g, '\n') : ''}
            </tr>
            <tr>
                <th>2</th>
                ${words[1] ? words[1].toString().replace(/,/g, '\n') : ''}
            </tr>
            <tr>
                <th>3</th>
                ${words[2] ? words[2].toString().replace(/,/g, '\n') : ''}
            </tr>
            <tr>
                <th>4</th>
                ${words[3] ? words[3].toString().replace(/,/g, '\n') : ''}
            </tr>
        </table>
    `;
});

function changeHost(passphrase) {
    socket.emit('changeHost', { passphrase: passphrase, name: name });
}

/* Modals */
//main clue modal
const modal = document.querySelector('.modal');
const trigger = document.querySelector('#trigger');
const closeButton = document.querySelector('.close-button');
function toggleModal() {
    modal.classList.toggle('show-modal');
}
function windowOnClick(event) {
    if (event.target === modal) {
        toggleModal();
    }
}
trigger.addEventListener('click', toggleModal);
closeButton.addEventListener('click', toggleModal);
window.addEventListener('click', windowOnClick);

//extra dynamic modals

function createModal({text, title, closeButton, cancelButton, customElements}) {
    if(!text) console.log('Must provide text for modal')
    
    let modal = document.createElement('div');
    modal.classList.add('modal', 'show-modal');
    let modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modal.append(modalContent);
    
    if(title) {
        let h3 = document.createElement('h3');
        h3.innerText = title;
        modalContent.appendChild(h3);
    }

    let p = document.createElement('p');
    p.innerText = text;
    modalContent.appendChild(p);

    if(customElements) {
       for(element in customElements) {
           modalContent.appendChild(customElements[element]);
       }
    }

    if(closeButton) {
        let btn = document.createElement('div');
        btn.innerText = closeButton;
        btn.className = 'close-button';
        modalContent.appendChild(btn)
    }

    if(cancelButton) {
        let btn = document.createElement('div');
        btn.innerText = cancelButton;
        btn.className = 'canceling close-button';
        modalContent.appendChild(btn)
    }



    document.querySelector('body').appendChild(modal);
    return modal;
}

function createAlertModal(text, title) {
    const modalContent = {title, text, closeButton: 'Ok'}
    let modal = createModal(modalContent);
    modal
        .getElementsByClassName('close-button')[0]
        .addEventListener('click', () => {
            modal.remove();
        });
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.remove();
    });
}

function createConfirmModal(question, title) {
    return new Promise((resolve, reject) => {
        const modalContent = {title, text: question, closeButton: 'Yes', cancelButton: 'No'}
        let modal = createModal(modalContent);
        //positive reply
        let sendYes = () => {
            modal.remove();
            resolve(true);
        };
        modal
            .getElementsByClassName('close-button')[0]
            .addEventListener('click', sendYes);
        //cancel/negative reply
        let sendNo = () => {
            modal.remove();
            resolve(false);
        };
        modal
            .getElementsByClassName('close-button')[1]
            .addEventListener('click', sendNo);
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
                reject('Err: Did not pick yes or no.');
            }
        });
    });
}

function addWordLimit(wordLimit, promptModal, input) {
    let wordsDiv = promptModal.querySelector('#words-div');
    let wordTitle = document.createElement('h3');
    input.addEventListener('keydown', (e) => {
        let words = [];
        if (input.value.trim() != '') words = input.value.trim().split(/\s+/);
        if (words.length < wordLimit)
            wordTitle.innerText = `${words.length} out of ${wordLimit} words.`;
        else {
            wordTitle.innerText = `${words.length} out of ${wordLimit} words.`;
            //prevent new word additions
            if (e.code === 'Space') input.maxLength = input.value.length;
            if (e.code === 'Backspace') input.maxLength = 524288; //default max input length
        }
        wordsDiv.appendChild(wordTitle);
    });
}

function createPromptModal(question, buttonText, wordLimit = 0) {
    return new Promise((resolve, reject) => {
        const wordLimitDiv = document.createElement('div')
        wordLimitDiv.id = 'words-div';

        const input = document.createElement('input');
        input.type = 'text'
        input.name = 'reply';

        const modalContent = {
            text:question, 
            closeButton: buttonText, 
            cancelButton: 'Cancel', 
            customElements: {
                wordLimitDiv, input
            }
        }
        let modal = createModal(modalContent);

        let returnValue = () => {
            let reply = input.value;
            modal.classList.toggle('show-modal');
            modal.remove();
            if (reply.trim() != '') resolve(reply);
            else reject('Please enter a value into the input.');
        };
        //on main button click return value
        modal
            .getElementsByClassName('close-button')[0]
            .addEventListener('click', returnValue);
        //on cancel button or window click just remove the modal
        modal
            .getElementsByClassName('close-button')[1]
            .addEventListener('click', () => {
                modal.remove();
            });
        window.addEventListener('click', (event) => {
            if (event.target === modal) modal.remove();
        });

        if (wordLimit > 0) addWordLimit(wordLimit, modal, input);
    });
}

async function newBoard(numWords) {
    try {
        let wordStr = await createPromptModal(
            'Enter 16 words for the new board.',
            'Ok',
            numWords
        );
        let wordArr = wordStr.replaceAll(',', '').trim().split(' ');
        if (wordArr.length === numWords) socket.emit('changeBoard', wordArr);
        else createAlertModal('Less than 16 words entered', 'Please try again');
    } catch (err) {
        createAlertModal(err, 'Error');
    }
}
