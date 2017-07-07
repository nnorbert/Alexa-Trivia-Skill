var config = require('./config');
var mysql = require("mysql");

var connection = mysql.createConnection(config.db_credentials);

connection.query('CREATE DATABASE IF NOT EXISTS trivia', function (err) {
    if (err) throw err;
    connection.query('USE trivia', function (err) {
        if (err) throw err;
        connection.query('CREATE TABLE IF NOT EXISTS session('
            + 'id INT NOT NULL AUTO_INCREMENT,'
            + 'PRIMARY KEY(id),'
            + 'uid VARCHAR(512),'
            + 'data BLOB'
            +  ')', function (err) {
                if (err) throw err;
        });

        connection.end();
    });
});
