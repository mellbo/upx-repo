<?php
date_default_timezone_set('Europe/Bucharest');
				
//$file = "res/" . (date('n')) . ".jpg";
  $file = 'res/' . rand(1,20) . '.jpg';
	
$type = 'image/jpeg';
header('Content-Type:'.$type);
header('Content-Length: ' . filesize($file));
readfile($file);
?>