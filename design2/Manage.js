
const events = require('events');


// custom modules 
const { Router } = require('./route');
const { session , attachBody }  = require('./base')


class Manager extends Router{

    constructor(){
        super() ;

        this.handlers = {
            RegHandler : new events() ,
            LgHandler   : new events() ,
            PollHandler : new events() 
        } ;
        this.mdwBag = [ session , attachBody ] ;

        this.liveBag = { } ;
        this.schduleBag = { } ;

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

    Execute_MiddleWare( request , response ){

        for( let mdw of this.mdwBag ){
            mdw.call( this , request , response );
        }
    }
    

}



module.exports = { Manager }