var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
// Routing
app.use(express.static(__dirname + '/public'));

var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

function get_users_by_room(nsp, room) {
    var users = []
    for (var id in io.of(nsp).adapter.rooms[room]) {
        users.push(io.of(nsp).adapter.nsp.connected[id].userId);
    };
    return users;
};

io.on('connection', function (socket) {
    console.info('socket connection');
    // when the client emits 'naviUserLogin', this listens and executes
    socket.on('naviUserLogin', function (data) {
        console.info('receive naviUserLogin event,data:', data);

        // we store the username in the socket session for this client
        socket.userId = data.userId;
        socket.activityId = data.activityId;

        //current socket run join command
        socket.join(data.activityId, function(err){
            if (err){
                console.error('user %s join room %s error:', data.userId, data.activityId, err);
            } else {
                console.info('user %s join room %s ok', data.userId, data.activityId);

                //tell curr user,you have login this room
                var clients = get_users_by_room('/', data.activityId);
                socket.emit('logined', clients);
                console.info('naviUserLogin room user list:', clients);

                // echo current room (all clients) that a person has connected
                socket.to(data.activityId).emit('naviUserLogined', {
                    userId:data.userId,
                    activityId:data.activityId
                });
            }
        });

    });

    // when the client emits 'new location', this listens and executes
    socket.on('newLocation', function (data) {
        console.info('receive newLocation event,data:', data);

        if (!socket.userId || !socket.activityId) {
            console.error('socket param has not set. newLocation data:', data);
            return;
        }
        // we tell the client to execute 'new message'
        socket.to(socket.activityId).emit('newLocation', {
            userId: socket.userId,
            activityId:socket.activityId,
            message: data
        });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        console.info('receive disconnect event');

        if (!socket.userId || !socket.activityId) {
            console.error('disconnect socket param has not set. newLocation data:');
            return;
        }

        //tell other user in this room, that user has left
        socket.to(socket.activityId).emit('naviUserLeft', {
            userId:socket.userId,
            activityId:socket.activityId
        });

        //leave romm
        socket.leave(socket.activityId);
    });

});

module.exports = app;
