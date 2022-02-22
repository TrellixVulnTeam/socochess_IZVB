import {INPUT_EVENT_TYPE, COLOR, Chessboard, MARKER_TYPE} from "https://socochess.sites.tjhsst.edu/src/cm-chessboard/Chessboard.js";
    var d;
    var game_over_bool = false
    
    navigator.mediaDevices.getUserMedia({video: true})
    .then(function(localStream) {
      document.getElementById("local-video").srcObject = localStream;
      //localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    })
    .catch();
    
    function get_piece_positions(game, piece) {
        return [].concat(...game.board().map((p, index) => {
            if (p !== null && p.type === piece.type && p.color === piece.color) {
                return index
            }
        }).filter(Number.isInteger).map((piece_index) => {
            const row = 'abcdefgh'[piece_index % 8]
            const column = Math.ceil((64 - piece_index) / 8)
            return row + column
        }))
    }
    
    // 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    
    var ws = new WebSocket(`wss://${location.host}${location.pathname}/`);
    console.log(`wss://${location.host}${location.pathname}/`);
    function isOpen(ws2) { return ws2.readyState === ws2.OPEN }
    
    function inputHandler(event) 
    {
        console.log("event", event);
        event.chessboard.removeMarkers(undefined, MARKER_TYPE.dot);
        if (event.type === INPUT_EVENT_TYPE.moveStart) {
            const moves = chess.moves({square: event.square, verbose: true});
            for (const move of moves) {
                board.addMarker(move.to, MARKER_TYPE.dot);
            }
            return moves.length > 0;
        } 
        else if (event.type === INPUT_EVENT_TYPE.moveDone) 
        {
            event.chessboard.removeMarkers(undefined, undefined);
            board.addMarker(event.squareFrom, MARKER_TYPE.frame)
            board.addMarker(event.squareTo, MARKER_TYPE.frame)
            var move = {from: event.squareFrom, to: event.squareTo};
            var possibleMoves = chess.moves();
            if (!(possibleMoves.includes(move))){
                move = {from: event.squareFrom, to: event.squareTo, promotion: 'q'};
            }
            const result = chess.move(move);
            console.log("move: ", move);
            if (result) {
                board.disableMoveInput();
                board.setPosition(chess.fen());
                updateMoveList(chess.history());
                possibleMoves = chess.moves({verbose: true});
                if (possibleMoves.length > 0) { //the url below should be ai1 for candidate or ai2 for best
                    if(isOpen(ws)){
                        ws.send(JSON.stringify({"message":"request_move", "pgn":chess.pgn(), "fen":chess.fen()}));
                    }
                    if(chess.in_check()){
                        let kingpos = get_piece_positions(chess.board(), {type:'k',color:'w'})
                        board.addMarker(kingpos[0], MARKER_TYPE.square)
                    }
                    console.log("requested_move: ", chess.history());
                }
                else{
                    
                    ws.send(JSON.stringify({"message":"game_over", "code":1}));
                }
                
                if(chess.game_over()){
                    ws.send(JSON.stringify({"message":"game_over", "code":1}));
                }
            } 
            else 
            {
                console.warn("invalid move", move);
            }
            return result;
        }
    }
    var chess;
    chess = new Chess();
    var board = "";
    var secret;
    var c = "white";
    function onmeese(message){
        if(JSON.parse(message.data).pgn === "OPEN"){
            ws.send(JSON.stringify({"message":"opening", "id":localStorage.getItem("user_id")}));
            
            if(JSON.parse(message.data).resume){
                chess.load_pgn(JSON.parse(message.data).resume_pgn) ;  
            }
            secret = JSON.parse(message.data).special;
            if(board === "" && JSON.parse(message.data).color == "black"){
                board = new Chessboard(document.getElementById("board"), {
                    position: chess.fen(),
                    sprite: {url: "/src/images/chessboard-sprite-staunty.svg"},
                    style: {
                        moveMarker: MARKER_TYPE.square, 
                        hoverMarker: undefined, 
                        aspectRation:0.5,
                        moveFromMarker: MARKER_TYPE.square,
                        moveToMarker: MARKER_TYPE.square
                    },
                    responsive: true,
                    orientation: COLOR.black
                });
                c = "black";
            }
            else if(board === "" && JSON.parse(message.data).color == "white"){
                board = new Chessboard(document.getElementById("board"), {
                    position: chess.fen(),
                    sprite: {url: "/src/images/chessboard-sprite-staunty.svg"},
                    style: {
                        moveMarker: MARKER_TYPE.square, 
                        hoverMarker: undefined, 
                        aspectRation:0.5,
                        moveFromMarker: MARKER_TYPE.square,
                        moveToMarker: MARKER_TYPE.square
                    },
                    responsive: true,
                    orientation: COLOR.white
                });
                c = "white";
            }
            if(JSON.parse(message.data).resume){
                if((chess.turn() === 'b' && JSON.parse(message.data).color == "white") || (chess.turn() === 'w' && JSON.parse(message.data).color == "black")){
                    if(isOpen(ws)){
                        ws.send(JSON.stringify({"message":"request_move", "pgn":chess.pgn(), "fen":chess.fen()}));
                    }
                    console.log("requested_move: ", chess.history());
                }
                else{
                    if(JSON.parse(message.data).color === "white"){
                        board.enableMoveInput(inputHandler, COLOR.white);
                    }
                    else{
                        board.enableMoveInput(inputHandler, COLOR.black);
                    }
                    updateMoveList(chess.history());
                } 
            }
            else{
                if(JSON.parse(message.data).color === "white"){
                    board.enableMoveInput(inputHandler, COLOR.white);
                }
                else{
                    board.enableMoveInput(inputHandler, COLOR.black);
                }
                updateMoveList(chess.history());
            } 
            //ws.send(JSON.stringify({"message":"game_over", "code":-1}));
        }
        // else if(board === ""){
        //     board = new Chessboard(document.getElementById("board"), {
        //         position: chess.fen(),
        //         sprite: {url: "/src/images/chessboard-sprite-staunty.svg"},
        //         style: {moveMarker: MARKER_TYPE.square, hoverMarker: undefined, aspectRation:0.5},
        //         responsive: true,
        //         orientation: COLOR.white
        //     });
        // }
        
        if(JSON.parse(message.data).broadcast == secret){
            if(JSON.parse(message.data).reset){
                board.disableMoveInput();
                //window.location.replace("/play/menu");
            }
            else{
                var mo = JSON.parse(message.data).uData;
                chess.load_pgn(mo);
                let h = chess.history({ verbose: true });
                let ffrom = h[h.length-1].from
                let tto = h[h.length-1].to
                
                board.removeMarkers(undefined, undefined);
                board.addMarker(ffrom, MARKER_TYPE.frame)
                board.addMarker(tto, MARKER_TYPE.frame)
                
                console.log(mo);
                if(JSON.parse(message.data).color === "white" && c == "black"){
                    board.enableMoveInput(inputHandler, COLOR.black);
                }
                else if(JSON.parse(message.data).color === "black" && c == "white"){
                    board.enableMoveInput(inputHandler, COLOR.white);
                }
                board.setPosition(chess.fen());
                updateMoveList(chess.history());
                if(chess.game_over()){
                    ws.send(JSON.stringify({"message":"game_over", "code":-1}));
                    board.disableMoveInput();
                }
            }
        }
    }
    ws.onmessage = onmeese;
    
    var a = setInterval(()=>{
        
        console.log(isOpen(ws));
        if(!isOpen(ws)){
            ws = new WebSocket(`wss://${location.host}${location.pathname}/`);
            ws.onmessage = onmeese;
            //ws.send(JSON.stringify({"message":"request_move_1", "pgn":chess.pgn(), "fen":chess.fen()}));
        }
    }, 1000);
        
    
    let ffbutton = document.getElementById("ffbutton");
    ffbutton.onclick = function forfeit(){
        if(!isOpen(ws)){
            ws = new WebSocket(`wss://${location.host}${location.pathname}/`);
            ws.onmessage = onmeese;
            //ws.send(JSON.stringify({"message":"request_move_1", "pgn":chess.pgn(), "fen":chess.fen()}));
        }
        ws.send(JSON.stringify({"message":"game_over", "code":-1}));
    }
    
    function updateMoveList(history) {
        // get the reference for the body
        var body = document.getElementById("moveList");

        // creates a <table> element and a <tbody> element
        var tbl = document.getElementById("table");
        body.removeChild(body.lastChild);
        tbl = document.createElement("table");
        var tblBody = document.createElement("tbody");
    
        // creating all cells
        for (var i = 0; i < history.length; i+=2) {
            // creates a table row
            var row = document.createElement("tr");
    
            for (var j = 0; j < 3; j++) {
                // Create a <td> element and a text node, make the text
                // node the contents of the <td>, and put the <td> at
                // the end of the table row
                var cell = document.createElement("td");
                let tbltext = "";
                if (j === 0) {
                    tbltext = "" + (i/2 + 1) + ".";
                }
                else{
                    tbltext += history[i+j-1];
                }
                var cellText = document.createTextNode(tbltext);
                if (j !== 0){
                    cell.className = "table table-move";
                }
                else{
                  cell.className = "table table-movenumber";
                }
                cell.appendChild(cellText);
                row.appendChild(cell);
            }
    
            // add the row to the end of the table body
            tblBody.appendChild(row);
        }
    
        // put the <tbody> in the <table>
        tbl.appendChild(tblBody);
        // appends <table> into <body>
        body.appendChild(tbl);
        // sets the border attribute of tbl to 2;
        tbl.setAttribute("border", "2");
    }
    
    