import * as fs from 'fs';
import randomLocation from 'random-location'

const radius = 300;

function readStations() {
    let stations = new Map();
    let stationsJson = JSON.parse(fs.readFileSync('./data/stations.json'));
    for(let station of stationsJson.stations) {
        stations.set(station.id.toString(), station.position);
    }
    return stations;
}

function readMatrices(stations) {
    const matricesFiles = fs.readdirSync('./results');
    let weekUsers = new Map();
    let weekendUsers = new Map();
    for(let file of matricesFiles) {
        let matrices = JSON.parse(fs.readFileSync(`./results/${file}`));
        let averageMatricesW = matrices.averageMatricesWeek;
        let averageMatricesWend = matrices.averageMatricesWeekend;
        weekUsers.set(file, createUsers(averageMatricesW, stations));
        weekendUsers.set(file, createUsers(averageMatricesWend, stations));
    }
    return {weekUsers: weekUsers, weekendUsers: weekendUsers};
}

function createUsers(matrices, stations) {
    let users = {
        initialUsers: []
    }
    for(let id_unplug in matrices) {
        for(let id_plug in matrices[id_unplug]) {
            for(let hour in matrices[id_unplug][id_plug]) {
                let numUsers = Math.round(matrices[id_unplug][id_plug][hour]);
                for(let i = 0; i < numUsers; i++) {
                    let stationUnplugPosition = stations.get(id_unplug);
                    let origin = randomLocation.randomCirclePoint(stationUnplugPosition, radius);
                    let stationPlugPosition = stations.get(id_plug);
                    let destiny = randomLocation.randomCirclePoint(stationPlugPosition, radius);
                    let timeInstant = getRandomInstant((parseInt(hour) * 3600), (3600 * (parseInt(hour) + 1)));
                    let newUser = {
                        position: origin,
                        userType: {
                            typeName : "USER_COMMUTER",
                            parameters: {
                                destinationPlace: destiny
                            }
                        },
                        timeInstant: timeInstant
                    }
                    users.initialUsers.push(newUser);
                }
            }
        }
    }
    return users;
}

function getRandomInstant(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function main() {
    let stations = readStations();
    let usersConfiguration = readMatrices(stations);
    for(let elem of usersConfiguration.weekUsers) {
        let titleFile = `./users_configuration/week_${elem[0]}`;
        fs.writeFile(titleFile, JSON.stringify(elem[1], null, 4), 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
        }); 
    }
    for(let elem of usersConfiguration.weekendUsers) {
        let titleFile = `./users_configuration/weekend_${elem[0]}`;
        fs.writeFile(titleFile, JSON.stringify(elem[1], null, 4), 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
        }); 
    }
}

main();