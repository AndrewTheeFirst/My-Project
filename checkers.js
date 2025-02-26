export const BOARD = document.body.querySelector("#center-grid");
const LEFT_TEXT = document.body.querySelector("#turn-info-left");
const RIGHT_TEXT = document.body.querySelector("#turn-info-right");
const SRCS = [["resources\\Wstone.png", "resources\\WKing.png"], ["resources\\Bstone.png", "resources\\BKing.png"]];
let color1;
let color2;
export class Checkers {
    constructor(player1 = "white", player2 = "black") {
        this.pieces = [];
        this.p1Pieces = [];
        this.p2Pieces = [];
        this.moveTiles = [];
        this.captureTiles = [];
        this.lastSelected = null;
        this.possibleCapture = false;
        this.moveString = "";
        color1 = player1;
        color2 = player2;
        this.initPieces();
        this.renderBoard(true);
        this.switchTurn();
    }
    // public initPiecesCustom(): void{
    //     let piece: Piece = new Piece(COLOR_1, "king", [3, 5])
    //     this.p1Pieces.push(piece)
    //     this.pieces.push(piece)
    //     piece = new Piece(COLOR_2, "king", [4, 6])
    //     this.p2Pieces.push(piece)
    //     this.pieces.push(piece)
    //     piece = new Piece(COLOR_2, "king", [6, 6])
    //     this.p2Pieces.push(piece)
    //     this.pieces.push(piece)
    //     piece = new Piece(COLOR_2, "king", [6, 4])
    //     this.p2Pieces.push(piece)
    //     this.pieces.push(piece)
    //     piece = new Piece(COLOR_2, "king", [4, 4])
    //     this.p2Pieces.push(piece)
    //     this.pieces.push(piece)
    //     piece = new Piece(COLOR_2, "king", [2, 4])
    //     this.p2Pieces.push(piece)
    //     this.pieces.push(piece)
    //     piece = new Piece(COLOR_2, "king", [2, 2])
    //     this.p2Pieces.push(piece)
    //     this.pieces.push(piece)
    // }
    initPieces() {
        let row = 0, numPiecesCreated = 0;
        for (let i = 0; i < 2; i++) { // loop is responsible for creating 2 sets of pieces
            let color = (i === 0) ? color1 : color2;
            for (let pieceNum = 0; pieceNum < 12; pieceNum++) { // loop is responsible for creating 12 pieces
                let col = Checkers.rowPieceToCol(row, pieceNum);
                let piece = new Piece(color, "stone", [col, row]);
                if (color === color1)
                    this.p1Pieces.push(piece);
                else if (color === color2)
                    this.p2Pieces.push(piece);
                this.pieces.push(piece);
                numPiecesCreated += 1;
                if (numPiecesCreated % 4 === 0) { // increases the row every 4 pieces created
                    row += 1;
                }
            }
            row += 2; // skip two rows to get to the correct row for the second set of pieces
        }
    }
    renderBoard(isFirstRun = false, pieces = null) {
        let piecesToRender = pieces;
        let tiles = Checkers.createNewTileMap();
        this.activateTileListeners(tiles);
        if (pieces)
            piecesToRender = pieces;
        else
            piecesToRender = this.pieces;
        for (let piece of piecesToRender) { // assigns a piece to a tile via getNumPos mapping
            let index = Piece.getNumPos(piece.position);
            if (index <= 63 && index >= 0) {
                let tile = tiles.get(index);
                tile.append(piece.image);
            }
        }
        if (!isFirstRun) // removes old tiles (with images) and replaces with ->
            removeAllChildren(BOARD);
        for (let counter = 0, index = 56; index >= 0; index++) { // loops for sensical coordinates
            BOARD.append(tiles.get(index));
            counter += 1;
            if (counter === 8) {
                index -= 16;
                counter = 0;
            }
        }
    }
    static createNewTileMap() {
        let tileMap = new Map();
        for (let index = 0; index < 64; index++) {
            let tile = document.createElement("div");
            tile.className = (Checkers.colorFromIndex(index)) ? "primary" : "secondary";
            tile.id = index.toString();
            tileMap.set(index, tile);
        }
        return tileMap;
    }
    activateTileListeners(tileMap) {
        for (let tile of tileMap.values()) {
            tile.addEventListener("click", () => {
                if (this.playerTurn != "none")
                    this.promptMove(Checkers.getPosFromNum(parseInt(tile.id)));
            });
        }
    }
    promptMove(pos, onlyCapture = false) {
        if (this.possibleCapture && !this.isGoldTile(this.getTileAtPos(pos))) { // forces multicapture
            return;
        }
        if (this.isGoldTile(this.getTileAtPos(pos))) { // if is a gold tile
            this.move(this.lastSelected, pos);
            this.possibleCapture = false; // resets if needed
        }
        else {
            this.clearGoldTiles(); // clear any gold tiles
            let selectedPiece = this.getPieceAtPos(pos); // get piece at tile clicked
            if (this.isPlayersTurnsPiece(selectedPiece)) {
                this.lastSelected = selectedPiece;
                this.pushCaptureTiles(selectedPiece);
                if (!onlyCapture)
                    this.pushMoveTiles(selectedPiece);
            }
            this.makePriorityGold();
        }
    }
    move(piece, pos) {
        let betweenPiece = this.getPieceBetween(piece.position, pos);
        this.moveString = this.moveString.concat(getRankFromPos(piece.position), getRankFromPos(pos));
        piece.setPos(pos); // set piece to new position
        if (betweenPiece) {
            betweenPiece.setPos([-1, 0]); // essentially removes piece from board
            this.renderBoard();
            this.clearGoldTiles();
            if (!this.checkForWinner()) {
                this.promptMove(pos, true); // are there more possible captures?
                if (this.captureTiles.length === 0) {
                    this.switchTurn();
                    this.possibleCapture = false;
                }
                else {
                    this.possibleCapture = true;
                }
            }
        }
        else {
            this.renderBoard();
            this.clearGoldTiles();
            if (!this.checkForWinner())
                this.switchTurn();
        }
    }
    pushCaptureTiles(piece) {
        let forward = piece.getForward();
        for (let index = 0; index < forward.length; index++) {
            forward[index] = 2 * forward[index];
        }
        for (let yDirection of forward) {
            for (let xDirection of [-2, 2]) {
                let newPos = Piece.changePosBy(piece.position, [xDirection, yDirection]);
                if (Piece.isValidPos(newPos) && !this.getPieceAtPos(newPos)) {
                    let betweenPiece = this.getPieceBetween(piece.position, newPos);
                    if (betweenPiece && betweenPiece.color != piece.color) { // there is a between piece
                        let tile = document.getElementById(Piece.getNumPos(newPos).toString());
                        this.captureTiles.push(tile);
                    }
                }
            }
        }
    }
    pushMoveTiles(piece) {
        let forward = piece.getForward();
        for (let yDirection of forward) {
            for (let xDirection of [1, -1]) {
                let newPos = Piece.changePosBy(piece.position, [xDirection, yDirection]);
                if (Piece.isValidPos(newPos) && !this.getPieceAtPos(newPos)) { // pos is on the board and there is no player at move tile
                    let tile = document.getElementById(Piece.getNumPos(newPos).toString());
                    this.moveTiles.push(tile);
                }
            }
        }
    }
    getPieceBetween(pos1, pos2) {
        let between = [(pos1[0] + pos2[0]) / 2, (pos1[1] + pos2[1]) / 2];
        if ((!Number.isInteger(between[0])) || (!Number.isInteger(between[1])))
            return null;
        else
            return this.getPieceAtPos(between);
    }
    switchTurn() {
        if (this.playerTurn === "p1") {
            this.playerTurn = "p2";
            RIGHT_TEXT.innerText = ``;
            LEFT_TEXT.innerText = `${color2}'s turn`;
        }
        else if (this.playerTurn === "p2") {
            this.playerTurn = "p1";
            RIGHT_TEXT.innerText = `${color1}'s turn`;
            LEFT_TEXT.innerText = ``;
        }
        else {
            this.playerTurn = "p1";
            RIGHT_TEXT.innerText = `${color1}'s turn`;
            LEFT_TEXT.innerText = ``;
        }
    }
    checkForWinner() {
        let op = (this.playerTurn === "p1") ? "p2" : "p1";
        for (let piece of this.getPlayerPieces(op)) {
            if (Piece.getNumPos(piece.position) != -1) {
                return false;
            }
        }
        if (op === "p1") {
            RIGHT_TEXT.innerText = ``;
            LEFT_TEXT.innerText = `${color2} wins!`;
        }
        else if (op === "p2") {
            RIGHT_TEXT.innerText = `${color1} wins!`;
            LEFT_TEXT.innerText = ``;
        }
        this.playerTurn = "none";
        console.log(this.moveString);
        return true;
    }
    isPlayersTurnsPiece(piece) {
        if (piece === null)
            return false;
        let pieces = this.getPlayerPieces(this.playerTurn);
        return piece.color === pieces[0].color;
    }
    getPlayerPieces(turn) {
        if (turn === "p1") {
            return this.p1Pieces;
        }
        else {
            return this.p2Pieces;
        }
    }
    static getPosFromNum(num) {
        let col = num % 8;
        let row = (num - col) / 8;
        return [col, row];
    }
    getPieceAtPos(pos) {
        for (let piece of this.pieces) {
            if ((piece.position[0] === pos[0]) && (piece.position[1] === pos[1])) {
                return piece;
            }
        }
        return null;
    }
    getTileAtPos(pos) {
        return document.getElementById(Piece.getNumPos(pos).toString());
    }
    makePriorityGold() {
        if (this.captureTiles.length != 0) {
            for (let tile of this.captureTiles) {
                tile.style.backgroundColor = "gold";
            }
            this.moveTiles = []; // don't allow player to avoid capturing
        }
        else if (this.moveTiles.length != 0) {
            for (let tile of this.moveTiles) {
                tile.style.backgroundColor = "gold";
            }
        }
    }
    clearGoldTiles() {
        for (let tile of this.moveTiles) {
            tile.style.removeProperty("background-color");
        }
        this.moveTiles = [];
        for (let tile of this.captureTiles) {
            tile.style.removeProperty("background-color");
        }
        this.captureTiles = [];
    }
    isGoldTile(selectedTile) {
        for (let tile of this.moveTiles) {
            if (tile.id === selectedTile.id) {
                return true;
            }
        }
        for (let tile of this.captureTiles) {
            if (tile.id === selectedTile.id) {
                return true;
            }
        }
        return false;
    }
    static rowPieceToCol(row, pieceNum) {
        return (pieceNum % 4) * 2 + row % 2;
    }
    static colorFromIndex(index) {
        let row = Math.floor(index / 8);
        let col = index % 8;
        if ((row + col) % 2 === 0) {
            return true;
        }
        else {
            return false;
        }
    }
}
export class Piece {
    constructor(color, type, position) {
        this.position = position;
        this.color = color;
        this.type = type;
        this.image = this.setImage();
    }
    setPos(pos) {
        this.position = pos;
        if (this.type != "king") {
            let promotionLane = (this.color === color1) ? 7 : 0;
            if (this.position[1] === promotionLane) {
                this.type = "king";
                this.image = this.setImage();
            }
        }
    }
    setImage() {
        let image = document.createElement("img");
        image.className = "game-piece";
        if (this.color === color1 && this.type === "stone")
            image.src = SRCS[0][0];
        else if (this.color === color1 && this.type === "king")
            image.src = SRCS[0][1];
        else if (this.color === color2 && this.type === "stone")
            image.src = SRCS[1][0];
        else if (this.color === color2 && this.type === "king")
            image.src = SRCS[1][1];
        return image;
    }
    static changePosBy(pos, change) {
        return [pos[0] + change[0], pos[1] + change[1]];
    }
    static getNumPos(pos) {
        return pos[0] + pos[1] * 8;
    }
    static isValidPos(pos) {
        return !(pos[0] < 0 || pos[1] < 0 || pos[0] > 7 || pos[1] > 7);
    }
    isInPieces(pieces) {
        for (let piece of pieces) {
            if (this === piece)
                return true;
        }
        return false;
    }
    getForward() {
        if (this.type === "stone") {
            if (this.color === color1)
                return [1];
            else
                return [-1];
        }
        else {
            return [1, -1];
        }
    }
    copy() {
        return new Piece(this.color, this.type, this.position);
    }
}
export class DisabledBoard extends Checkers {
    constructor(moveString) {
        super(); // initializes board
        this.pointer = 0;
        this.pieceStates = [];
        let buttons = DisabledBoard.createReplayButtons(); // set up board buttons
        buttons[0].onclick = () => { this.decState(); };
        buttons[1].onclick = () => { this.incState(); };
        DisabledBoard.appendMoves(moveString); // formats and prints moves to screen
        this.pushPieceState(); // saves initial board state
        this.runThrough(moveString); // runs through game and saves all states
        this.renderBoard(false, this.pieceStates[0]); // starts replay from the beginning
    }
    activateTileListeners(tileMap) {
        // overrides to deactivate board
    }
    incState() {
        this.deemphasizePointer();
        if (this.pointer + 1 < this.pieceStates.length)
            this.pointer += 1;
        this.renderBoard(false, this.pieceStates[this.pointer]);
        this.emphasizePointer();
    }
    decState() {
        this.deemphasizePointer();
        if (this.pointer - 1 >= 0)
            this.pointer -= 1;
        this.renderBoard(false, this.pieceStates[this.pointer]);
        this.emphasizePointer();
    }
    move(piece, pos) {
        super.move(piece, pos);
        this.pushPieceState();
    }
    pushPieceState() {
        let tempPieces = [];
        for (let piece of this.pieces)
            tempPieces.push(piece.copy());
        this.pieceStates.push(tempPieces);
    }
    runThrough(moveString) {
        for (let index = 0; index < moveString.length; index += 2) {
            let rank = moveString.slice(index, index + 2);
            let pos = getPosFromRank(rank);
            this.promptMove(pos);
        }
    }
    deemphasizePointer() {
        if (this.pointer != 0) {
            let textBlock = document.getElementById("btn-" + this.pointer.toString());
            textBlock.style.backgroundColor = "";
        }
    }
    emphasizePointer() {
        if (this.pointer != 0) {
            let textBlock = document.getElementById("btn-" + this.pointer.toString());
            textBlock.style.backgroundColor = "gold";
        }
    }
    static createReplayButtons() {
        let container = document.getElementById("h-box-button");
        let decButton = document.createElement("button");
        let incButton = document.createElement("button");
        decButton.innerText = "Decrement Button";
        incButton.innerText = "Increment Button";
        decButton.id = "dec-button";
        incButton.id = "inc-button";
        decButton.className = "replay";
        incButton.className = "replay";
        container.append(decButton);
        container.append(incButton);
        return [decButton, incButton];
    }
    static appendMoves(moveString) {
        let transformedString = DisabledBoard.transformMoveString(moveString);
        let container = document.getElementById("move-container");
        let index = 1;
        for (let string of transformedString) {
            let currentDiv = document.createElement("div");
            currentDiv.innerText = string;
            currentDiv.id = "btn-" + index.toString();
            container.append(currentDiv);
            index++;
        }
    }
    static transformMoveString(moveString) {
        let newString = "";
        for (let index = 0; index < moveString.length; index += 4) {
            newString = newString.concat(`${moveString.slice(index, index + 2)} \u2192 ${moveString.slice(index + 2, index + 4)}\
            ${(index + 4 < moveString.length) ? "," : ""}`);
        }
        return newString.split(",");
    }
}
function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
function getRankFromPos(pos) {
    let _rank = "HGFEDCBA";
    let rank = _rank[pos[1]] + (pos[0] + 1).toString();
    return rank;
}
function getPosFromRank(rank) {
    let _rank = "HGFEDCBA";
    let pos = [Number.parseInt(rank[1]) - 1, _rank.indexOf(rank[0])];
    return pos;
}
