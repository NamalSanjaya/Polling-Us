
const events = require('events');


// custom modules 
const { Router } = require('./route');
const { Cipher }        = require('./Encrpt');
const { voteSeperation , session , attachBody }  = require('./base')


class Manager extends Router {

    constructor(){
        super() ;
        this.encrpt   = new Cipher( 'bubble48' , 'salt' );
        this.handlers = {
            RegHandler  : new events() ,
            LgHandler   : new events() ,
            PollHandler : new events() ,    // to write
            PollReader  : new events()      // to read
        } ;
        this.mdwBag = [ [ voteSeperation , {} ] , 
                        [ session        , { enc: this.encrpt } ] ,
                        [ attachBody ,     {} ]   ] ;

        this.liveBag = { } ;
        this.schduleBag = { } ;
        this.quesNo   = 120 ;
        this.ansStart = 1080 ;
     
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
        this.ansStart += 8 ;
    }

    Execute_MiddleWare( request , response ){

        for( let mdw of this.mdwBag ){
            mdw[0].call( this , request , response  , mdw[1] );
        }
    }
}


module.exports = { Manager }