"use strict"
const program = require('commander');
import * as fs from 'fs';
import * as readline from 'readline';
import {Stream} from 'stream';

const numStations = 176;

function createDemmandMatrices(startDate, endDate, filesDirectory) { return new Promise((resolve, reject) => {
    let files = fs.readdirSync(filesDirectory);
    let counter = 0;
    let matricesWeek = initMatrices();
    let matricesWeekend = initMatrices();

    let daysCounterWeek = 0;
    let daysCounterWeekend = 0;
    let datesMapWeek = new Map();
    let datesMapWeekend = new Map();
    let counterRegister_R = 0;
    let velocityCyclingAverage_R = 0;

    let numFiles = files.length-1;
    for(let file of files) {
        if(file === ".DS_Store"){
            continue;
        }
        //Check file date
        let date = file.split("_")[0];
        let year = date.substring(0, 4);
        let month = date.substring(4, 6);
        let fileDate = new Date(`${year}/${month}/01`);
        let tempStartDate = new Date(`${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()}`);
        let tempEndDate = new Date(`${endDate.getFullYear()}/${endDate.getMonth() + 1}/${endDate.getDate()}`);
        console.log(file);
        let inputStream = fs.createReadStream(`${filesDirectory}/${file}`);
        let outputStream = new Stream;
        let rline = readline.createInterface(inputStream, outputStream);
        
        rline.on('line', (line) => {
            let route = JSON.parse(line);
            let date = new Date(route.unplug_hourTime.date);
            let hour = date.getHours();
            let dateString = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
            if(date >= startDate && date <= endDate) {
                if(isWeekend(date)) {
                    if(datesMapWeekend.get(dateString) === undefined) {
                        datesMapWeekend.set(dateString, true);
                        daysCounterWeekend += 1;
                    }
                    addValueToMatrix(route, matricesWeekend, hour);
                    velocityCyclingAverage_R += addVelocity(route, velocityCyclingAverage_R);
                    counterRegister_R = addCounterRegister(route, counterRegister_R);
                }
                else {
                    if(datesMapWeek.get(dateString) === undefined) {
                        datesMapWeek.set(dateString, true);
                        daysCounterWeek += 1;
                    }
                    addValueToMatrix(route, matricesWeek, hour);
                    velocityCyclingAverage_R += addVelocity(route, velocityCyclingAverage_R);
                    counterRegister_R = addCounterRegister(route, counterRegister_R);
                }
            }
            else {
            }   
        });

        rline.on('close', (line) => {
            counter++;
            console.log(`File ${file} readed`);
            if(counter === numFiles) {
                velocityCyclingAverage_R = velocityCyclingAverage_R / counterRegister_R;
                resolve({matricesWeek, matricesWeekend, daysCounterWeek, daysCounterWeekend, velocityCyclingAverage_R});
            }
        })
    }
})}

function addCounterRegister(route, counterRegister_R){
    counterRegister_R +=1;
    return counterRegister_R;
}

function addVelocity(route, velocityCyclingAverage_R){
    let track = route.track;
    if(track !== undefined){
        return calculateVelocity(track);
    }else{
        return 5;
    }
}

function calculateVelocity(track){
    let velocity = 0;
    let featuresList = track.features;
    for (let i=0; i < featuresList.length; i++){
        velocity += featuresList[i].properties.speed;
    }
    return (velocity / featuresList.length);
}

function createAverageMatrices(matrices, totalDays) {
    let averageMatrices = initMatrices();
    for(let idunplug_station in matrices) {
        for(let idplug_station in matrices[idunplug_station]) {
            for(let hour in matrices[idunplug_station][idplug_station]) {
                let valueMatrix = matrices[idunplug_station][idplug_station][hour];
                if(totalDays === 0) {
                    continue;
                }
                averageMatrices[idunplug_station][idplug_station][hour] = valueMatrix / totalDays;
            }
        }
    }
    return averageMatrices;
}

function isWeekend(date) {
    return date.getDay() % 6 === 0;
}

function initMatrices() {
    let matrices = new Object();
    for(let i = 1; i <= numStations; i++) {
        matrices[i] = new Object();
        for(let j = 1; j <= numStations; j++) {
            matrices[i][j] = new Object();
            for(let h = 0; h <= 23; h++) {
                matrices[i][j][h] = 0;
            }
        }
    }
    return matrices;
}

function initMatrix() {
    let matrix = new Object();
    for(let i = 1; i <= numStations; i++) {
        matrix[i] = new Object();
        for(let h = 0; h <= 23; h++) {
            matrix[i][h] = 0;
        }
    }
    return matrix;
}

function addValueToMatrix(route, matrices, hour) {
    if(route.idunplug_station <= numStations && route.idplug_station <= numStations) {
        matrices[route.idunplug_station][route.idplug_station][hour] += 1;
    }
}

function checkAndGetDates(startDate, endDate) {
    let start = new Date(startDate);
    let end = new Date(endDate);
    if(start.toString() === "Invalid Date") {
        throw Error("Invalid start date");
    }
    if(end.toString() === "Invalid Date") {
        throw Error("Invalid end date");
    }
    return { start: start, end: end};
}

function matrixUsersStationByInstant(matrices) {
    let matrix = initMatrix();
    for(let idunplug_station in matrices) {
        for(let idplug_station in matrices[idunplug_station]) {
            for(let hour in matrices[idunplug_station][idplug_station]) {
                matrix[idunplug_station][hour] += matrices[idunplug_station][idplug_station][hour];
            }
        }
    }
    return matrix;
}

function createProbabilityMatrices(matrices, totalUsersMatrix) {
    let probabilityMatrix = initMatrices();
    for(let idunplug_station in matrices) {
        for(let idplug_station in matrices[idunplug_station]) {
            for(let hour in matrices[idunplug_station][idplug_station]) {
                let totalUsers = totalUsersMatrix[idunplug_station][hour];
                let auxUsers = matrices[idunplug_station][idplug_station][hour];
                if(totalUsers === 0){
                    continue;
                }
                probabilityMatrix[idunplug_station][idplug_station][hour] = auxUsers / totalUsers;
            }
        }
    }
    return probabilityMatrix;
}

function createTotalStationsAverageMatrix(matrices){
    let sumHours = Array.apply(null, Array(24)).map(Number.prototype.valueOf,0);
    for(let i=1 ; i<=numStations ; i++){
        for(let j=1 ; j<=numStations ; j++){
            for(let h=0; h<=23 ; h++){
                sumHours[h] += matrices[i][j][h];
            }
        }
    }
    return sumHours;
}

async function main() {
    program
        .version('0.0.1')
        .option('-s, --startDate <stdate>', 'Specify start date, optional', undefined)
        .option('-e, --endDate <edate>', 'Specify end date, optional', undefined)
        .option('-d, --dataDir <dDir>', 'Data where files are stored', undefined)
        .option('-o, --output <output>', 'Where resultant matrices are stored', undefined)
        .parse(process.argv);
    try {
        if(program.startDate === undefined || program.endDate === undefined) {
            console.log('You must specify a range of dates. See --startDate and --endDate');
            return;
        }
        if(program.dataDir === undefined) {
            console.log('You must define a directory to read. See --dataDir');
            return;
        }
        if(program.output === undefined) {
            console.log('You must define a directory to store results. See --output');
            return;
        }
        let startDate = program.startDate;
        let endDate = program.endDate;
        let filesDirectory = program.dataDir;
        let resultDirectory = program.output;
        let dateRange = checkAndGetDates(startDate, endDate);
        let result = await createDemmandMatrices(dateRange.start, dateRange.end, filesDirectory);
        result.averageMatricesWeek = createAverageMatrices(result.matricesWeek, result.daysCounterWeek);
        result.averageMatricesWeekend = createAverageMatrices(result.matricesWeekend, result.daysCounterWeekend);
        result.averageAllStationsMatrixWeek_R = createTotalStationsAverageMatrix(result.averageMatricesWeek)
        result.averageAllStationsMatrixWeekend_R = createTotalStationsAverageMatrix(result.averageMatricesWeekend)
        result.totalUsersStationByInstantWeek = matrixUsersStationByInstant(result.matricesWeek);
        result.totalUsersStationByInstantWeekend = matrixUsersStationByInstant(result.matricesWeekend);
        result.probabilityMatrixWeek = createProbabilityMatrices(result.matricesWeek, result.totalUsersStationByInstantWeek);
        result.probabilityMatrixWeekend = createProbabilityMatrices(result.matricesWeekend, result.totalUsersStationByInstantWeekend);
        fs.writeFile(resultDirectory, JSON.stringify(result, null, 4), 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
        
        /*
        let resultDirectoryWeekPercentage = resultDirectory.slice(0, -5);
        fs.writeFile(`${resultDirectoryWeekPercentage}_prob_week_matrix.json`, JSON.stringify(result.probabilityMatrixWeek, null, 4), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
        
        
        let resultDirectoryWeekendPercentage = resultDirectory.slice(0, -5);
        fs.writeFile(`${resultDirectoryWeekendPercentage}_prob_weekend_matrix.json`, JSON.stringify(result.probabilityMatrixWeekend, null, 4), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        })
        */
    }
    catch(error) {
        console.error(error);
        console.error("Usage example: --startDate 06/01/2018 --endDate 08/31/2018");
    }
}

main();
