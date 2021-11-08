
class URLname{
    constructor(path , cb){
        this.pathname = path ;
        this.callback = cb ;
    }
}


class Router{
    constructor(){

        this.urlPattern = {
            home:'/' , register:'/home/register' , login:'/home/login' , my:'/my' , regConfirm: '/home/confirm'  ,
            logout:'/my/logout' , createpoll:'/my/create-poll' , vote: '/vote' , voteView: '/vote/view',notFnd: '/home/404', 
            poll:{
                timeExtend: '/my/poll/time-extend' , editPoll: '/my/poll-edit' , delPoll: '/my/poll-delete' , endPoll:'/my/poll-end'
            } , mySchedule: '/my/schedule' , myHistory:'/my/history'
        }
       
        this.GET  = [  ];
        this.POST = [  ];
        this.CSSpaths = [ 'bar.css' , 'base.css' , 'home.css' , 'login.css' , 'register.css' , 'createpoll.css' , 'vote.css' , 'myBase.css' ]
    }

    _StaticFileExcute( request , response  , array , pattern ){
        let reqUrl = request.url.replace(  pattern , '' );
        request.url = reqUrl ;

        for( let each of array){
            if( each == reqUrl ){
                this.GET[ this.GET.length - 1 ].callback.call(this ,request ,response)
                return true;
            }
        }
        return false ;
    }


    _excute( request , response  , array ){
        let reqUrl = request.url ;

        for( let echNode of array ){
            if( echNode.pathname == reqUrl ){
               
                echNode.callback.call( this , request  , response );
                return true ;
            }
        }

        return false ;
    }

    matchCSS( path , pattern){
        let st = path.search( pattern ) ;
    
        if( st == 0){
            return true ;
        }
        return false;
    
    }

    get( path , cb){

        let _Url = new URLname( path , cb );
        this.GET.push( _Url );
        return 
    }

    post( path , cb ){
        let _Url = new URLname( path ,  cb );
        this.POST.push( _Url );
        return 
    }

    router( request , response ){

        let st;
        if( request.method == 'GET'){
            if( this.matchCSS( request.url , /^\/CSS\// ) ){
                st = this._StaticFileExcute(request,response, this.CSSpaths ,/^\/CSS\// );
            }
            else{
                st = this._excute( request , response , this.GET );
            }

        }

        else if( request.method == 'POST' ){
            st = this._excute( request , response , this.POST ) ;
        }

        else{
            /// for other types - eg : PUT, DELETE
        }

        return st ; //return false if there is no matching path
                    //(-- test --)

    }

    path(){
        return this.urlPattern
    }

}


module.exports = { Router }

