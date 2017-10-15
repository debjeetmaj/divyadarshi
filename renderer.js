// Register OpenFileDialog
console.log("renderer included.")
const ipc = require('electron').ipcRenderer
var events = require('events')
var eventEmitter = new events.EventEmitter()
var util = require('util')
const icon_default = "./resources/drawable/show_default.ico"
var Library = require('./library.js').Library
var Show = require('./library.js').Show
var Season = require('./library.js').Season
var Episode = require('./library.js').Episode
var shell =  require('electron').shell
const $ = require('jquery')
const fs = require('fs')
const path = require('path')
const myutil = require('./util.js')

var pathseperator = "/"

if (process.platform == 'win32') {
    pathseperator = "\\"
}
watching = null
library = null
new_content = []
// used to track which Series is view currently changes with browsing
// stores indices to show, season, episode array of corresponding object 
currently_on = [-1,-1,-1]
library_json_path = path.join(__dirname,"resources","json","library.json")
watching_json_path = path.join(__dirname,"resources","json","watching.json")

$("#seasons_holder").hide()
$("#episodes_holder").hide()

fs.exists(library_json_path, function(exists){
  if(exists){
    console.log("library.json exists.")
    fs.readFile(library_json_path,function(err,data){
      if(err){
        console.log(err);
      }
      else{
        json = JSON.parse(data)
        library = Library.fromJSON(json)
        for(var i=0;i<library.shows.length;i++){
          library.path_to_index_dict[library.shows[i].file] = i
        }
        console.log("Library object Loaded.")
        repaint_libraryview()
        eventEmitter.emit('library_created')
      }
    })
  }
  else{
    library = Object.create(Library)
    library.constructor(0,new Date(),null,[])
    console.log("Library object created.")
    repaint_libraryview()
  }
})

eventEmitter.on('library_created',function(){
    console.log("Library created event")
    fs.exists(watching_json_path, function(exists){
    if(exists){
      console.log("watching.json exists.")
      fs.readFile(watching_json_path,function(err,data){
        if(err){
          console.log(err);
        }
        else{
          console.log("Watching info  :"+data)
          watching = JSON.parse(data)
          // watching = Library.fromJSON(json)
          // json.forEach(w=>{
          //   watching.push(Episode.fromJSON(w))
          // })

          console.log("Watching object Loaded.")
          repaint_watchingview()
        }
      })
    }
    else{
        watching = {"show_ids":[]}
        console.log("Watching object Created.")
        repaint_watchingview()
    }
  })
})

eventEmitter.on('library_updated',function(){
  console.log("Library Updated !!!")
  fs.writeFile(path.join(__dirname,"resources","json","library.json" ),JSON.stringify(library.toJSON()),function(err){
    if(err)
    {
      console.log(err)
    }
    else
      console.log("Library File written!!")
  })
  // library.show
  repaint_libraryview()
})
eventEmitter.on('watching_updated',function(){
  console.log("Watch list Updated !!!")
  // var watchJson = watching
  fs.writeFile(path.join(__dirname,"resources","json","watching.json" ),JSON.stringify(watching),function(err){
    if(err)
    {
      console.log(err)
    }
    else
      console.log("Watch List File written!!")
  })
  // library.show
  repaint_watchingview()
})
// ADD and Watch Buttons
$('#select_directory').click(function (event){
  ipc.send('open-file-dialog')
  console.log("File Dialog opened.")
})
$('#watch_directory').click(function (event){
  ipc.send('open-file-dialog')
  console.log("File Dialog opened.")
})
// Drag and Drop functionality
const holder = document.getElementById("content")
if(holder!=null){
  holder.ondragover =() =>{
    // TODO something with mouse cursor
    return false;
  }
  holder.ondragleave = holder.ondragend =() => {
    return false;
  }
  holder.ondrop = (event) =>{
      event.preventDefault()
      var lib_updated = false
      for (let f of event.dataTransfer.files){
        console.log(f.path)
        if (fs.lstatSync(f.path).isDirectory())
        { 
          // assumption library object is not null
          add_to_library(f.path)
        }
      }
      return false;
  }
}
ipc.on('selected-directory', function (event, folder) {
  var folders = `${folder}`.split(',')
  folders.forEach(folder =>{
      add_to_library(folder)
  })
})
//
function add_to_library(folder){
  if(library == null){
    library = Object.create(Lib.Library)
    library.constructor(0,new Date(),null,[])
    console.log("Library object created.")
  }
  if(library.path_to_index_dict[folder]==null){
    console.log("Found new show at"+folder)
    var show = prepare_show_object(folder)
    if(show==null)
      return
    var index = library.add_show(show)
    if(index >=0)
    {
      library.last_updated = new Date();
      new_content.push(index)
      showProgress(["Show added from "+ folder])
      eventEmitter.emit('library_updated')
    }
  }
  else{
    showProgress([folder+" Already present in library"])
  }
}
function prepare_show_object(folder){
  // check if its root directory of show,i.e., has season directories or episodes directly
  season_dir = []
  var icon_file = ""
  fs.readdirSync(folder).forEach(file =>{
    // console.log(file)
    if (fs.existsSync(path.join(folder,file)))
    {  
      // console.log(file +" : " +file.search('Season')+" "+fs.existsSync(file)+" "+fs.lstatSync(file).isDirectory())
      if(fs.lstatSync(path.join(folder,file)).isDirectory() && file.search(/Season\s\d+/g)>=0)
      {
        season_dir.push(file)
        console.log("Season directory found at "+path.join(folder,file));
      }
      else if(fs.lstatSync(path.join(folder,file)).isFile())
      {
        var ext = file.slice(file.lastIndexOf('.')+1,file.length)
        if(ext == "ico"){
          icon_file = path.join(folder,file)
          console.log("Icon resource found at "+icon_file)
        }
      }
    }
  }) 
  if(season_dir.length == 0)
  {
    // console.log(folder + " is not TV Show Directory, Organize it as Show > Seasons")
    showProgress([folder + " is not TV Show Directory, Organize it as Show > Seasons"])  
    return null
  }
  else{
    var show = Object.create(Show)
    var showname = folder.slice(folder.lastIndexOf(pathseperator)+1,folder.length)
    show.constructor(0,showname,folder,[],icon_file)
    // season_dir.sort(stringComparator)W
    for(var i=0 ; i< season_dir.length; i++){
      season_number = parseInt(season_dir[i].match(/\d+/g)[0])
      console.log("Reading Season "+season_number)
      var season = Object.create(Season)
      // Look up episodes
      season.constructor(season_number,"Season "+season_number,path.join(folder,season_dir[i]),[])
      var episodeList = []
      fs.readdirSync(path.join(folder,season_dir[i])).forEach(file =>{
      // console.log(file)
        if (fs.existsSync(path.join(folder,season_dir[i],file)))
        {  
          if(fs.lstatSync(path.join(folder,season_dir[i],file)).isFile())
          {
            ext = file.slice(file.lastIndexOf('.')+1,file.length)
            if( ext == "avi" || ext == "mp4" || ext == "mkv" || ext == 'm4v')
            {
              episodeList.push(file)
              console.log("Episode found : "+file);
            }
          }
          else{
            fs.readdirSync(path.join(folder,season_dir[i],file)).forEach(f=>{
              if(fs.lstatSync(path.join(folder,season_dir[i],file,f)).isFile())
              {
                ext = f.slice(f.lastIndexOf('.')+1,f.length)
                if( ext == "avi" || ext == "mp4" || ext == "mkv" || ext == 'm4v')
                {
                  episodeList.push(file+'?'+f)
                  console.log("Episode found : "+file);
                }
              }
            })
          }
        }
      })
      for(var j=0 ; j<episodeList.length; j++) {
        var episode = Object.create(Episode)
        dp = ""
        file =""
        if(episodeList[j].search(/\?/g)>=0){
          x = episodeList[j].split('?')
          dp = x[0]
          file = path.join(folder,season_dir[i],x[0],x[1])
        }
        else{
          dp = (episodeList[j].slice(0,episodeList[j].lastIndexOf('.')))
          file = path.join(folder,season_dir[i],episodeList[j])
        }
        epN = myutil.getEpisodeNo(dp)
        if(!isNaN(epN)){
          dp = dp.replace(/\./g," ")
          console.log(dp)
          episode.constructor(epN,dp,file)
          season.add_episode(episode)
        }
        else{
          console.log("Unable to get episode No. from the filenaming.")
        }
      }
      season.episodes.sort(function(x,y){
        return x.episode_number - y.episode_number
      })
      show.add_season(season)
    }
    show.seasons.sort(function(a,b){
      return a.season_number - b.season_number;
    })
    console.log(show.display_name+" created.")
    // add_to_library(show)
    return show
  }
}

function repaint_libraryview(){
  // reload whole library
  var non_icon_liItem = '<li class="tile tooltip" id="show_%d"><div class="header"><h2>%d</h2></div><div class="container">%s</div></li>'
  var icon_liItem = '<li class="icon_tile tooltip" id="show_%d"><img src="%s" alt="%d" style="width:100%"><div class="container">%s</div>'+
  '<span class="tooltiptext">%s</span></li>'
  if(new_content == null || new_content.length ==0){
        if(library.shows!= null && library.shows.length > 0){
          $("#empty_message").hide()
          $("#shows_list").html("")
          for(var i=0;i<library.shows.length;i++){
            addLibraryItemTile(i)
          }
        }
      $("#nav1").click()
  }
  else{
      $("#empty_message").hide()
      new_content.forEach(index =>{
        addLibraryItemTile(index)
      })
      new_content = []
      $("#nav1").click()
  }
}
function addLibraryItemTile(index){
  var icon_liItem = '<li class="icon_tile tooltip" id="show_%d">'
  +  '<img src="%s" alt="%d" style="width:100%"><div class="container">%s</div>'
  // +  '<span class="tooltiptext">%s</span>'
  +  '</li>';
  console.log(" Added to shows list "+library.shows[index].display_name)
  // $("#shows_list").append('<li class="tile show_tile" id="show_'+id+'">'+library.shows[id-1].display_name+'</li>')
  var icon = icon_default
  if(library.shows[index].icon_file!="" && fs.existsSync(library.shows[index].icon_file))
      icon = library.shows[index].icon_file
  // $("#shows_list").append(util.format(icon_liItem,index,icon,index+1,library.shows[index].display_name,library.shows[index].file))   
  $("#shows_list").append(util.format(icon_liItem,index,icon,index+1,library.shows[index].display_name))      
  $("#show_"+index).data("index",index)
  $("#show_"+index).click(function(){onShowTileClick($( this ).data("index"))})
  $("#show_"+index).bind('contextmenu', function(e) {
     e.preventDefault();
     console.log('The eventhandler will make sure, that the contextmenu dosn&#39;t appear.');
     ipc.send('show-context-menu',$( this ).data("index"));
  });
}

function repaint_watchingview(){
  console.log("repaint_watchingview")
  var icon_liItem = '<li class="icon_tile" id="w_episode_%d"><img src="%s" alt="%d" style="width:100%"><div class="container">%s</div></li>'
  var non_icon_liItem = '<li class="tile tooltip" id="w_episode_%d"><div class="current_header"><h2>%d</h2></div><div class="container">%s<span class="tooltiptext">%s</span></div></li>'
  if(watching==null || watching["show_ids"].length == 0){
      console.log("Watching object is empty")
      $("#watching_deafult_message").show()
      $("#watching_list").hide()
  }
  else{
    $("#watching_default_message").hide()
    $("#watching_list").html("");
    var count = 6;
    for(var i=0;i<watching["show_ids"].length && i< count ;i++){
      var id= watching["show_ids"][i];
      var ep = library.shows[watching[id][0]].seasons[watching[id][1]].episodes[watching[id][2]]
      // console.log(JSON.stringify(ep))
      var short_name = myutil.shorten_display_name(ep.display_name)
      $("#watching_list").append(util.format(non_icon_liItem,id,ep.episode_number,short_name,ep.display_name))
      $("#w_episode_"+id).data("show_index",id)
      $("#w_episode_"+id).data("season_index",watching[id][1])
      $("#w_episode_"+id).data("episode_index",watching[id][2])
      $("#w_episode_"+id).click(function(){onWatchingTileClick($( this ).data("show_index"),$( this ).data("season_index"),$( this ).data("episode_index"))})
    }
    $("#watching_list").show()
  }
}
function onShowTileClick(index){
  var liItem = '<li class="tile tooltip" id="season_%d"><div class="%s"><h2>%d</h2></div>'
              +'<div class="container">%s</div>'
              // +'<span class="tooltiptext">%s</span>'
              +'</li>'
  console.log("Loading Show "+ index)
  //update show index
  currently_on[0] = index
  var show = library.shows[index]
  if(show.seasons && show.seasons.length > 0){
    $("#seasons_default_msg").hide()
    $("#seasons_list").html("")
    $("#episodes_list").html("")
    for(var i=0;i<show.seasons.length;i++){
      var header_class = "header"
      if(watching!=null && watching[currently_on[0]] && watching[currently_on[0]][1]== i)
        header_class = "current_header"
      // $("#seasons_list").append(util.format(liItem,i,header_class,show.seasons[i].season_number,show.seasons[i].display_name,showseasons[i].file))
      $("#seasons_list").append(util.format(liItem,i,header_class,show.seasons[i].season_number,show.seasons[i].display_name))
      $("#season_"+i).data("index",i)
      $("#season_"+i).click(function(){onSeasonTileClick($( this ).data("index"))})
    }
  // show.seasons.forEach(season =>{
  //   $("#seasons_list").append('<li class="tile" id="season_'+season.season_number+'">'+season.display_name+'</li>')
  //   $("#season_"+season.season_number).on("click",function(){onSeasonTileClick(season)})
  // })
}
else{
  $("#seasons_default_msg").show()
}
  $("#shows_holder").hide("slow")
  $("#seasons_holder").show("slow")
  $("#nav2").html(show.display_name)
  $("#nav1").attr("class","non_active")
  $("#nav2").attr("class","active")
  $("#nav2").show()
}
function onSeasonTileClick(index){
  console.log("Season tile with "+index+" called.")
  console.log("Show index on "+currently_on[0])
  var liItem = '<li class="tile tooltip" id="episode_%d"><div class="%s"><h2>%d</h2></div><div class="container">%s</div><span class="tooltiptext">%s</span></li>'
  var season = library.shows[currently_on[0]].seasons[index]
  currently_on[1] = index
  console.log("Loading Season "+ season.season_number)
  if(season.episodes && season.episodes.length > 0){
    $("#episodes_default_msg").hide()
    $("#episodes_list").html("")
    for(var i =0;i<season.episodes.length;i++){
      var ep = season.episodes[i]
      // console.log(JSON.stringify(ep))
      var name = myutil.shorten_display_name(ep.display_name)
      var header_class = "header"
      if(watching !=null && watching[currently_on[0]] && watching[currently_on[0]][1]==index && watching[currently_on[0]][2]==i)
        header_class = "current_header"
      $("#episodes_list").append(util.format(liItem,i,header_class,ep.episode_number,name,ep.display_name))
      $("#episode_"+i).data("index",i)
      $("#episode_"+i).click(function(){onEpisodeTileClick($( this ).data("index"),true)})
    }
  }
  else
    $("#episodes_default_msg").show()
  $("#seasons_holder").hide("slow")
  $("#episodes_holder").show("slow")
  $("#nav1").attr("class","non_active")
  $("#nav2").attr("class","non_active")
  $("#nav3").attr("class","active")
  $("#nav3").show()
  $("#nav3").html(season.display_name)
}
function onEpisodeTileClick(index,add_to_watchlist){
  //already watching then change the color of previous watched to normal
  if(watching!=null && watching[currently_on[0]]!=null && watching[currently_on[0]][1]==currently_on[1]){
      var sel = $("#episode_"+watching[currently_on[0]][2]).children("div.current_header")
      if(sel) 
        sel.attr("class","header")
  }
  currently_on[2] = index
  // mark clicked episode as current
  var selected_ep = $("#episode_"+index).children("div.header")
  if(selected_ep)
    selected_ep.attr("class","current_header")
  var ep = library.shows[currently_on[0]].seasons[currently_on[1]].episodes[index]
  console.log("Playing Episode "+ ep.episode_number +" "+ add_to_watchlist)
  shell.openExternal(path.join("file://",ep.file))
  // Do some animation and launch in media player
  showProgress(["Now Playing "+ep.display_name])
  if(add_to_watchlist){
    //clone the currently_on object to avoid error
    if(watching[currently_on[0]]==null){
      watching["show_ids"].push(currently_on[0])
    }
    watching[currently_on[0]] = currently_on.slice(0)
    eventEmitter.emit('watching_updated')
  }
  // ipc.send('put-in-tray')
}
function onWatchingTileClick(show_id,season_id,episode_id){
  currently_on = [show_id,season_id,episode_id]
  
  var liItem = '<li class="tile tooltip" id="season_%d"><div class="%s"><h2>%d</h2></div><div class="container">%s</div>'
              +'<span class="tooltiptext">%s</span></li>'
  console.log("Loading Show "+ show_id)
  //update show index
  // currently_on[0] = index
  var show = library.shows[show_id]
  if(show.seasons && show.seasons.length > 0){
    $("#seasons_default_msg").hide()
    $("#seasons_list").html("")
    $("#episodes_list").html("")
    for(var i=0;i<show.seasons.length;i++){
      var header_class = "header"
      if(watching[currently_on[0]] && watching[currently_on[0]][1]== i)
        header_class = "current_header"
      $("#seasons_list").append(util.format(liItem,i,header_class,show.seasons[i].season_number,show.seasons[i].display_name,show.seasons[i].file))
      $("#season_"+i).data("index",i)
      $("#season_"+i).click(function(){onSeasonTileClick($( this ).data("index"))})
    }
  }
  else{
    $("#seasons_default_msg").show()
  }
  //TODO make function, doing same thing as populating episodes view with modifications
  liItem = '<li class="tile tooltip" id="episode_%d"><div class="%s"><h2>%d</h2></div><div class="container">%s</div><span class="tooltiptext">%s</span></li>'
  var season = library.shows[currently_on[0]].seasons[season_id]
  console.log("Loading Season "+ season.season_number)
  if(season.episodes && season.episodes.length > 0){
    $("#episodes_default_msg").hide()
  $("#episodes_list").html("")
   for(var i =0;i<season.episodes.length;i++){
     var ep = season.episodes[i]
      // console.log(JSON.stringify(ep))
     var name = myutil.shorten_display_name(ep.display_name)
     var header_class = "header"
     if(watching[currently_on[0]] && watching[currently_on[0]][1]==season_id && watching[currently_on[0]][2]==i)
      header_class = "current_header"
     $("#episodes_list").append(util.format(liItem,i,header_class,ep.episode_number,name,ep.display_name))
     $("#episode_"+i).data("index",i)
     $("#episode_"+i).click(function(){onEpisodeTileClick($( this ).data("index"),true)})
    }
  }
  else
    $("#episodes_default_msg").show()
  $("#shows_holder").hide()
  $("#seasons_holder").hide("slow")
  $("#episodes_holder").show("slow")
  $("#nav1").attr("class","non_active")
  $("#nav2").html(library.shows[currently_on[0]].display_name)
  $("#nav2").show()
  $("#nav2").attr("class","non_active")
  $("#nav3").attr("class","active")
  $("#nav3").show()
  $("#nav3").html(season.display_name)
  showProgress(["Last watching "+season.episodes[watching[currently_on[0]][2]].display_name])
}

$("#nav1").click(function(){
  currently_on = [-1,-1,-1]
    $("#episodes_holder").hide()
    $("#seasons_holder").hide()
    $("#shows_holder").show()
    $("#nav1").attr("class","active")
    // $("#nav1").attr("class","active")
    $("#nav2").hide()
    $("#nav3").hide()
})

$("#nav2").click(function(){
    $("#episodes_holder").hide()
    $("#seasons_holder").show()
    $("#shows_holder").hide()
    $("#nav1").attr("class","non_active")
    $("#nav2").attr("class","active")
    $("#nav3").hide()
  currently_on[1] = currently_on[2] = -1
})

function  showProgress(progressMessage){
  $("#progress").html("")
  progressMessage.forEach( pmsg=>{
    $("#progress").append("<p>"+progressMessage+"</p>")
  })
  $("#progress").show().delay(myutil.PROGRESS_MESSAGE_VANISH_DELAY).fadeOut();
}

ipc.on('refresh-show', function (event,showid) {
  console.log(showid);
  console.log(library.get_show(showid).file);
  var updatedShow = prepare_show_object(library.get_show(showid).file)
  library.add_show(updatedShow)
  eventEmitter.emit('library_updated')
})

ipc.on('delete-show', function (event,showid) {
  console.log(showid);
})
