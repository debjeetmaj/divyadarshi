// Wrapper for library.json
var path = require("path")

exports.Library = {
      "class" : "Library",
      "constructor" : function(last_id,date_created,last_updated,shows){
        this.name = "library";
        this.last_id = last_id;
        this.date_created = date_created;
        this.last_updated = last_updated;
        this.shows = shows;
      },
      "get_show" : function(id){
        return this.shows[id];
      },
      "add_show" : function(show){
          if(this.path_to_index_dict[show.file]==null)
          {
            show.id = this.generate_id();
            this.shows.push(show);
            this.path_to_index_dict[show.file] =this.shows.length-1;
            // return the index of the show
            return this.shows.length-1;
          }
          else {
            // update operation
            this.shows[this.path_to_index_dict[show.file]] = show
            return -1;
          }
      },
      "generate_id" : function(){
          this.last_id+=1;
          return this.last_id;
      },
      "path_to_index_dict":{},
      "toJSON" : function(){
          showsJSON = []
          for(var i = 0;i<this.shows.length;i++){
            showsJSON.push(this.shows[i].toJSON())
          }
          return {
            "name" : "library",
            "date_created" : this.date_created.toDateString(),
            "last_updated" : (new Date()).toDateString(),
            "shows" : showsJSON,
            "last_id" : this.last_id
          }
      },
      "fromJSON" : function(data){
        // var data = JSON.parse(json);
        var e = Object.create(exports.Library)
        showList = []
        data.shows.forEach(show =>{
          showList.push(exports.Show.fromJSON(show))
        })
        e.constructor(data.last_id,new Date(data.date_created),new Date(data.last_updated),showList)
        return e    
      } 
}
exports.Show = {
  "constructor" : function(id,dp,folder,seasons,icon_file){
      this.id = id
      this.display_name = dp//folder.slice(folder.lastIndexOf('\\')+1,folder.length);
      this.file = folder
      this.seasons = seasons
      this.icon_file = icon_file
  },
  "add_season" : function(new_season){
    // season_number = season.match('[0-9]*')[0]
    // console.log(season_number)
    // var new_season = Object.create(season_number,season,path.join(this.folder,season,[]))
    this.seasons.push(new_season)
  },
  "toJSON" : function(){
      seasonsJSON = []
      for(var i=0;i<this.seasons.length;i++){
        seasonsJSON.push(this.seasons[i].toJSON())
      }
      return {
        "id" : this.id,
        "display_name" : this.display_name,
        "file" : this.file,
        "seasons" : seasonsJSON,
        "icon_file" : this.icon_file
      }
  },
  "fromJSON" : function(data){
    // var data = JSON.parse(json)
    var e = Object.create(exports.Show)
    seasons = []
    data.seasons.forEach(season =>{
      seasons.push(exports.Season.fromJSON(season))
    })
    e.constructor(data.id,data.display_name,data.file,seasons,data.icon_file)
    return e
  }

}
exports.Season = {
  "constructor" : function(season_number,display_name,file_path,episodes){
    this.season_number = season_number;
    this.display_name = display_name;
    this.file = file_path
    this.episodes = episodes
  },
  "toJSON" : function(){
    episodesJSON = []
    for(var i=0;this.episodes && i< this.episodes.length;i++){
      episodesJSON.push(this.episodes[i].toJSON())
    }
    return {
      "season_number" : this.season_number,
      "display_name" : this.display_name,
      "file" : this.file,
      "episodes" : episodesJSON
    }
  },
  "fromJSON" : function(data){
    // var data = JSON.parse(json)
    var e = Object.create(exports.Season)
    episodes = []
    data.episodes.forEach(ep =>{
      episodes.push(exports.Episode.fromJSON(ep))
    })
    // console.log(episodes.length)
    e.constructor(data.season_number,data.display_name,data.file,episodes)
    return e
  },
  "add_episode" : function(new_episode){
    this.episodes.push(new_episode)
  }
}
exports.Episode = {
  "constructor" : function(episode_number,display_name,file){
    this.episode_number = episode_number;
    this.display_name = display_name;
    this.file = file
  },
  "toJSON" : function(){
    return {
      "episode_number" : this.episode_number,
      "display_name" : this.display_name,
      "file" : this.file,
    }
  },
  "fromJSON" : function(data){
    // var data = JSON.parse(json)
    var e = Object.create(exports.Episode)
    e.constructor(data.episode_number,data.display_name,data.file)
    return e
  }
}