//node module
const events = require('events');

// npm dependencies
const  nodemailer = require('nodemailer');

// custom modules 
const { Router } = require('./route');
const { Cipher }        = require('./Encrpt');
const { voteSeperation , session , attachBody }  = require('./base')

class Manager extends Router {

    constructor(){
        super() ;
        this.encrpt   = new Cipher( process.env.crp_poll_key, process.env.crp_poll_val );
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
        this.quesNo   = 101 ;
        this.ansStart = 1001 ;
        this.pendUser = 101 ;

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.poll_email  ,
              pass: process.env.poll_email_PW 
            }
          });
     
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

    sendEmail( toMail , token , controller  ){
        let confirmLink = 'https://polling-us.herokuapp.com/home/confirm?rid=' + token ;
       
        let mailOptions = {
            from: 'PollingUsApp@gmail.com',
            to: toMail,
            subject: 'Account confirmation - Polling..',
            html: `<h3> Account verification - Polling..</h3>  
                   <p> verify your account by clicking the link.<br>
                   <small> link will be expired within one hour.</small></p> 
            
                   <a href=${ confirmLink }> verify my account </a>
            
                   <p> Thanks for joining with us.</p>`
        };

        this.transporter.sendMail( mailOptions, function(err, info){
            if (err) {
                // server error occuried. use controller for handle server error
                console.log(error);
            }
            else{
                console.log('sent : ' + info.response );
            }
            return ;
          });

    return ;
    }
}


module.exports = { Manager }