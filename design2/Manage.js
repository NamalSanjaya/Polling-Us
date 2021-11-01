
const events = require('events');


// custom modules 
const { Router } = require('./route');
const {voteSeperation , session , attachBody }  = require('./base')


class Manager extends Router{

    constructor(){
        super() ;

        this.handlers = {
            RegHandler : new events() ,
            LgHandler   : new events() ,
            PollHandler : new events() ,    // to write
            PollReader  : new events()      // to read
        } ;
        this.mdwBag = [ voteSeperation , session , attachBody ] ;

        this.liveBag = { } ;
        this.schduleBag = { } ;
        this.quesNo = 132;
        this.ansStart = 1230 ;

    }

    add( mdw ){
        this.mdwBag.push( mdw );
        return ;
    }

    LgHandler(){
        return this.handlers.LgHandler ;
    }

    RegHandler(){
        return this.handlers.RegHandler ;
    }
    
    PollHandler(){
        return this.handlers.PollHandler ;
    }

    PollReader(){
        return this.handlers.PollReader ;
    }

    setForNxtPoll( ansAmout ){
        this.quesNo ++ ;
        this.ansStart += ansAmout ;
    }

    Execute_MiddleWare( request , response ){

        for( let mdw of this.mdwBag ){
            mdw.call( this , request , response );
        }
    }
    

}



module.exports = { Manager }