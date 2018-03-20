const { Client, Util } = require('discord.js');
const prefix  = process.env.BOT_PREFIX;
const google_api_key = process.env.GOOGLE_APIKEY;
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const Youtube = require('simple-youtube-api');

const client = new Client({ disableEveryone: true });

const youtube = new Youtube(google_api_key);

const queue = new Map();

client.on('message', async message => {
	if (message.author.bot) return undefined;
	if (!message.content.startsWith(prefix)) return undefined;
	const args = message.content.split(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const searchString = args.slice(1).join(' ');
	const serverQueue = queue.get(message.guild.id);

	if(message.content.startsWith(`${prefix}play`)){
		const voiceChannel = message.member.voiceChannel;
		if(!voiceChannel) return message.channel.send(':negative_squared_cross_mark: **You are not in a voice channel**. Please join one to use this command.');
		const permissions = voiceChannel.permissionsFor(message.client.user);
		if(!permissions.has('CONNECT')) {
			return message.channel.send(':negative_squared_cross_mark: Unfortunately, it has failed. Please make sure I have the **CONNECT** permission enabled');
		}
		if(!permissions.has('SPEAK')) {
			return message.channel.send(':negative_squared_cross_mark: Unfortunately, it has failed. Please make sure I have the **SPEAK** permission enabled');
		}
	try {
		var video = await youtube.getVideo(url);
	} catch (error) {
			try{
				var videos = await youtube.searchVideos(searchString, 1);
				var video = await youtube.getVideoByID(videos[0].id);
			} catch (err){
				console.error(err);
				return message.channel.send(':negative_squared_cross_mark: No search results found!');
			}
				}

					const song = {
					id : video.id,
					title : Util.escapeMarkdown(video.title),
					url : `https://www.youtube.com/watch?v=${video.id}`,
					thumbnail : `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
					durationmin : video.duration.minutes,
					durationsec : video.duration.seconds,
					channel : video.channel.title,
					publishdate : video.publishedAt
				};

				if(!serverQueue) {
					const queueConstruct = {
							textChannel: message.channel,
							voiceChannel: voiceChannel,
							connection: null,
							songs: [],
							volume: 5,
							playing: true
					};
					queue.set(message.guild.id, queueConstruct);

					queueConstruct.songs.push(song);

					try{
						var connection = await voiceChannel.join();
						queueConstruct.connection = connection;
						play(message.guild, queueConstruct.songs[0]);
					}catch(error){
						console.error(`:no_entry_sign: Couldn't join the voice channel: ${error}`);
						queue.delete(message.guild.id);
						return message.channel.send(`:no_entry_sign: Couldn't join the voice channel: ${error}`);
					}

				} else {
					serverQueue.songs.push(song);
					return message.channel.send(`:notes: **${song.title}** has been added to the queue!`);
				}
				return undefined;
	}else if (message.content.startsWith(`${prefix}skip`)){
		if (!message.member.voiceChannel) return message.channel.send(":negative_squared_cross_mark: **You are not in a voice channel to use that command!**");
		if(!serverQueue) return message.channel.send(':negative_squared_cross_mark: No songs playing currently that I could skip for you!');
		message.channel.send(':white_check_mark: **Song skipped**');
		serverQueue.connection.dispatcher.end();
		return undefined;
	}else if(message.content.startsWith(`${prefix}leave`)){
		const voiceChannel = message.member.voiceChannel;
		if (!message.member.voiceChannel) return message.channel.send(":negative_squared_cross_mark: **You are not in a voice channel to use that command!**");
		if(serverQueue) return message.channel.send(':negative_squared_cross_mark: Songs are still playing. Please try again later.');
		voiceChannel.leave();
		return message.channel.send(':white_check_mark: **Successfully left the channel**');
	}else if(message.content.startsWith(`${prefix}stop`)){
		if (!message.member.voiceChannel) return message.channel.send(":negative_squared_cross_mark: **You are not in a voice channel to use that command!**");
		if(!serverQueue) return message.channel.send(':negative_squared_cross_mark: No songs playing currently that I could stop for you.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end();
		message.channel.send(':stop_button: **Stopped all songs from playing**');
		return undefined;
	}else if(message.content.startsWith(`${prefix}np`)){
		if(!message.member.voiceChannel) return message.channel.send(":negative_squared_cross_mark: **You are not in a voice channel to use that command!**");
		if(!serverQueue) return message.channel.send(':negative_squared_cross_mark: Nothing is playing at the moment');
		const npembed = new Discord.RichEmbed()
			.setAuthor("Now Playing...", icon = "https://images.emojiterra.com/emojione/v2/512px/25b6.png")
			.setThumbnail(serverQueue.songs[0].thumbnail)
			.setColor('#42f4aa')
			.addField("Song Name", serverQueue.songs[0].title, true)
			.addField("Channel", serverQueue.songs[0].channel, true)
			.addField("Duration", '**'+serverQueue.songs[0].durationmin+'** minutes **'+serverQueue.songs[0].durationsec+'** seconds', true)
			.addField("Published At", serverQueue.songs[0].publishdate, true)
			.addField("Youtube Link", serverQueue.songs[0].url)
			.setFooter("Like what you're hearing? Support the creators by checking out their channels using the provided youtube links!")
		message.channel.send({embed:npembed});
		return undefined;
	}else if(message.content.startsWith(`${prefix}volume`) || message.content.startsWith(`${prefix}vol`)){
		if (!message.member.voiceChannel) return message.channel.send(":negative_squared_cross_mark: **You are not in a voice channel to use that command!**");
		if(!serverQueue) return message.channel.send(':negative_squared_cross_mark: Nothing is playing at the moment');
		if(!args[1]) return message.channel.send(`:loud_sound: Current volume: ${serverQueue.volume}`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return message.channel.send(`:loud_sound: Volume is set to: **${serverQueue.volume}**`);
	}else if(message.content.startsWith(`${prefix}q`) || message.content.startsWith(`${prefix}queue`)){
		if (!message.member.voiceChannel) return message.channel.send(":negative_squared_cross_mark: **You are not in a voice channel to use that command!**");
		if(!serverQueue) return message.channel.send(':negative_squared_cross_mark: No songs are playing at the moment.');
		let index = 0;
		let embed = new Discord.RichEmbed()
			.setAuthor("Song queue", icon = "https://cdn2.iconfinder.com/data/icons/flat-style-svg-icons-part-1/512/forward_track_button-512.png")
			.setColor("#fc2020")
			.setThumbnail("https://images.discordapp.net/avatars/300745164866191361/465ed30d8e90d5e2d46e0ae687447a40.png?size=512")
			.addField("Now Playing", `:musical_note: ${serverQueue.songs[0].title}`)
			.addField("Current queue:", `${serverQueue.songs.map(song => `${++index}. ${song.title}`).join('\n')}`)
			message.channel.send({embed:embed});
		return undefined;
	}else if(message.content.startsWith(`${prefix}help`)){
		const helpembed = new Discord.RichEmbed()
			.setAuthor('Commands', icon = client.user.avatarURL)
			.setDescription('**play** - Plays a specified song\n**stop** - Stops all queueing songs from playing\n**skip** - Skips a song that\'s currently playing\n**np** - Shows the currently playing song\'s information\n**q** or **queue** - Displays a list of queueing songs\n**vol** or **volume** - Set your desired volume, preferably 1 to 5\n**leave** - Leaves a voice channel')
			.setColor('#f7a145')
			.setFooter('More commands to come in the future, but for now, hope you have fun listening to music using these commands! You can always use \'hb!help\' to refer to my commands anytime you want. Muzic On guys! ')
		const dialog = new Discord.RichEmbed()
			.setAuthor(`Hello, ${message.author.username}!`)
			.setDescription(`Pleased to meet you! As you already know, the name\'s ${client.user.username}. :sunglasses: I\'m a music bot created by someone that\'s inexperienced as hell. :thinking: But don\'t worry, he\'ll manage upgrading all my perks and all! So for now, enjoy these commands that I have in store for you. :smirk:`)
			.setImage(client.user.avatarURL)
			.setColor('#f7a145')
		await message.author.send({embed:dialog});
		await message.author.send({embed:helpembed});
		message.channel.send(`:mailbox_with_mail: ${message.author}`);
		return undefined;
	}
	return undefined;
});

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if(!song) {
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));

	dispatcher.setVolumeLogarithmic(serverQueue.volume/5);

	serverQueue.textChannel.send(`:notes: **[Current Song]** ${song.title}.`);
}

client.on('ready',async () => {
	console.log(`${client.user.username} has launched!`);

	try{
		let link = await client.generateInvite(["ADMINISTRATOR"]);
		console.log(link);
	}catch(e){
			console.log(e.stack);
		}

	client.user.setActivity("音楽 | hb!help",{type:'PLAYING'});

});

client.login(process.env.BOT_TOKEN);
