//CONSTANTS
const TEXT_CLIP_LENGTH = 20
exports.PROGRESS_MESSAGE_VANISH_DELAY = 3000 //in ms
//Simple utility functions
exports.getEpisodeNo = function(episode_Name){
    // episode_Name = document.getElementById('episodeName').value
    epN = ""
    // episode_Name = document.getElementById('episodeName').value()
    episode_Name = episode_Name.toUpperCase()
    if(episode_Name.search(/E\d+/g)>=0)
    {
        epN = episode_Name.match(/E\d+/g)[0].replace(/E/g,"")
    }
    else if(episode_Name.search(/\.\d+\./g)>=0){
        epN = episode_Name.match(/\.\d+\./g)[0].replace(/\./g,"")
    }
    else if(episode_Name.search(/x\d+/g)>=0)
    {
        epN = episode_Name.match(/x\d+/g)[0].replace(/x/g,"")
    }
    else if(episode_Name.search(/Episode\s\d+/g)>=0)
    {
        epN = episode_Name.match(/Episode\s\d+/g)[0].replace(/Episode\s/g,"")
    }
    else if(episode_Name.search(/\d+\s/g)>=0)
    {
        epN = episode_Name.match(/\d+\s/g)[0].replace(/\s/g,"")
    }
    epN =parseInt(epN)
    // alert(epN)
    return epN
}
// Shortens the length of a name to fixed Length
exports.shorten_display_name = function(actual_name){
  var name = actual_name
  if(actual_name.length > TEXT_CLIP_LENGTH)
     name = actual_name.slice(0,TEXT_CLIP_LENGTH-3) + "..."
  return name
}