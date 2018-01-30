const Client = require('instagram-private-api').V1;
const delay = require('delay');
const chalk = require('chalk');
const _ = require('lodash');
const rp = require('request-promise');
const inquirer = require('inquirer');

const User = [
	{
		type:'input',
		name:'username',
		message:'| Masukan User Anda |',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'password',
		name:'password',
		message:'| Masukan Password Anda |',
		mask:'*',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'input',
		name:'target',
		message:'| Masukan Nama Instagram Target [ TANPA MEMAKAI @ ]|',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'input',
		name:'text',
		message:'Masukan Bot Komen Anda, Jika Lebih Dari Satu Pakai Pemisah | ',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'input',
		name:'sleep',
		message:'Masukan Jeda Waktu Bot [SARAN 300000] (In MiliSeconds)',
		validate: function(value){
			value = value.match(/[0-9]/);
			if (value) return true;
			return 'Delay is number';
		}
	}
]

const Login = async function(User){

    const Device = new Client.Device(User.username);
    const Storage = new Client.CookieMemoryStorage();
    const session = new Client.Session(Device, Storage);

    try {
        await Client.Session.create(Device, Storage, User.username, User.password)
        const account = await session.getAccount();
        return Promise.resolve({session,account});
    } catch (err) {
        return Promise.reject(err);
    }

}

const Target = async function(username){
	const url = 'https://www.instagram.com/'+username+'/?__a=1'
	const option = {
		url: url,
		method: 'GET',
		json:true
	}
	try{
		const account = await rp(option);
		if (account.user.is_private) {
			return Promise.reject('PENGGUNA AKUN BERSIFAT PRIBADI/GAGAL CARI LAIN');
		} else {
			const id = account.user.id;
			const followers = account.user.followed_by.count;
			return Promise.resolve({id,followers});			
		}
	} catch (err){
		return Promise.reject(err);
	}

}

async function ngefollow(session,accountId){
	try {
		await Client.Relationship.create(session, accountId);
		return true
	} catch (e) {
		return false
	}
}

async function ngeComment(session, id, text){
	try {
		await Client.Comment.create(session, id, text);
		return true;
	} catch(e){
		return false;
	}
}

async function ngeLike(session, id){
	try{
		await Client.Like.create(session, id)
		return true;
	} catch(e) {
		return false;
	}
}

const CommentAndLike = async function(session, accountId, text){
	var result;

	const feed = new Client.Feed.UserMedia(session, accountId);

	try {
		result = await feed.get();
	} catch (err) {
		return chalk`{bold.red ${err}}`;
	}

	if (result.length > 0) {
		const task = [
			ngefollow(session, accountId),
			ngeComment(session, result[0].params.id, text),
			ngeLike(session, result[0].params.id)
		]
		const [Follow,Comment,Like] = await Promise.all(task);
		const printFollow = Follow ? chalk`{green Follow}` : chalk`{red Follow}`;
		const printComment = Comment ? chalk`{green Comment}` : chalk`{red Comment}`;
		const printLike = Like ? chalk`{green Like}` : chalk`{red Like}`;
		return chalk`{bold.green ${printFollow},${printComment},${printLike} [${text}]}`;
	}
	return chalk`{red MEDIA PROFILE KOSONG [DI LEWATI][ BOT BY © BASIS IJO [FOLLOW IG] @BASISIJO ]}`
};

const Followers = async function(session, id){
	const feed = new Client.Feed.AccountFollowers(session, id);
	try{
		const Pollowers = [];
		var cursor;
		do {
			if (cursor) feed.setCursor(cursor);
			const getPollowers = await feed.get();
			await Promise.all(getPollowers.map(async(akun) => {
				Pollowers.push(akun.id);
			}))
			cursor = await feed.getCursor();
		} while(feed.isMoreAvailable());
		return Promise.resolve(Pollowers);
	} catch(err){
		return Promise.reject(err);
	}
}

const Excute = async function(User, TargetUsername, Text, Sleep){
	try {
		console.log(chalk`{green \n | Masuk Ke Dalam Akun Anda |. . .}`)
		const doLogin = await Login(User);
		console.log(chalk`{red  | SUKSES | Mulai Identifikasi User ....}`)
		const getTarget = await Target(TargetUsername);
		console.log(chalk`{green  | ${TargetUsername} | [${getTarget.id}] Jumlah Pengikut: ${getTarget.followers}}`)
		const getFollowers = await Followers(doLogin.session, doLogin.account.id)
		console.log(chalk`{green  | MEMULAI BOT | \n}`)
		const Targetfeed = new Client.Feed.AccountFollowers(doLogin.session, getTarget.id);
		var TargetCursor;
		do {
			if (TargetCursor) Targetfeed.setCursor(TargetCursor);
			var TargetResult = await Targetfeed.get();
			TargetResult = _.chunk(TargetResult, 10);
			for (let i = 0; i < TargetResult.length; i++) {
				await Promise.all(TargetResult[i].map(async(akun) [ BOT BY © BASIS IJO [FOLLOW IG] @BASISIJO ] {
					if (!getFollowers.includes(akun.id) && akun.params.isPrivate === false) {
						var ranText = Text[Math.floor(Math.random() * Text.length)];
						const ngeDo = await CommentAndLike(doLogin.session, akun.id, ranText)
						console.log(chalk`{bold.green ☑}${akun.params.username} [ BOT BY © BASIS IJO [FOLLOW IG] @BASISIJO ] ${ngeDo}`)
					} else {
						console.log(chalk`{bold.pink User Di Lewati}${akun.params.username} -_- AKUN TERKUNCI [ DILEWATI ]`)
					}
				}));
				console.log(chalk`{pink Delay For ${Sleep} MiliSeconds}`);
				await delay(Sleep);
			}
			TargetCursor = await Targetfeed.getCursor();
			console.log(chalk`{pink Jeda ${Sleep} Detik Lalu Melanjutkan Bot}`);
			await delay(Sleep);
		} while(Targetfeed.isMoreAvailable());
	} catch (err) {
		console.log(err);
	}
}

console.log(chalk`
{bold TOOLS INSTAGRAM}
{yellow VIP USER}
{bold.green VVIP BOT BASIS IJO}
`);

inquirer.prompt(User)
	.then(answers [ BOT BY © BASIS IJO [FOLLOW IG] @BASISIJO ] {
		var text = answers.text.split('|');
		Excute({
			username:answers.username,
			password:answers.password
		},answers.target,text,answers.sleep);
	})
