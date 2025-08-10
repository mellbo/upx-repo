$(window).on("load", function() {
	var width = $(window).width();
	var height = $(window).height()-($(window).height()*0.3); 
	$('#mediaplaybackdiv').html('<iframe src="http://g0.ipcamlive.com/player/player.php?alias=5df8c77d75ddf&autoplay=0&hidelink=1&skin=white&disablereportbutton=1" width="'+width+'" height="'+height+'" frameborder="0" frameborder="0" hidelink="1" allowfullscreen></iframe>');
 });