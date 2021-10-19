

class URLname{
    constructor(path , cb){
        this.pathname = path ;
        this.callback = cb ;
    }
}


class Router{
    constructor(){

        this.urlPattern = {
            home:'/home' , register:'/home/register' , login:'/home/login' , my:'/my' ,
            logout:'/my/logout' , createpoll:'/my/create-poll'
        }
       
        this.GET  = [  ];
        this.POST = [  ] ;
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
            st = this._excute( request , response , this.GET );
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

// let root = new Root();

// root.get('/' , (res)=>{
//     console.log('route : /' , res.name );
// });

// root.get('/home' , (res)=>{
//     console.log('route : /home' , res.name );
// });

// root.post('/register' , (res)=>{
//     console.log('route : /register' , res.name  );
// });


// root.router( { method : 'POST' , url : '/register' } , { name:'nimal'} )


