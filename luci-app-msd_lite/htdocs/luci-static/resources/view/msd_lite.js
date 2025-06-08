'use strict';
'require view';
'require fs';
'require form';
'require poll';
'require uci';
'require rpc';
'require tools.widgets as widgets';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

const callServiceStop = rpc.declare({
	object: 'service',
	method: 'stop',
	params: ['name', 'instance'],
	expect: { result: false }
});

function getInstanceStatus(instanceName) {
	return L.resolveDefault(callServiceList('msd_lite'), {}).then((res) => {
		try {
			return !!res['msd_lite']['instances'][instanceName]['running'];
		} catch (e) {
			return false;
		}
	});
}

function renderStatus(isRunning) {
	const color = isRunning ? 'green' : 'red';
	const text = isRunning ? _('Running') : _('Not Running');
	return `<em><span style="color:${color}"><strong>${text}</strong></span></em>`;
}


return view.extend({
	render: function () {
		const m = new form.Map('msd_lite', _('Multi Stream daemon Lite'),
			_('The lightweight version of Multi Stream daemon (msd) for organizing IPTV streaming over HTTP.'));

		const s = m.section(form.TypedSection, 'instance', _('Instances'));
		s.anonymous = false;
		s.addremove = true;
		s.addbtntitle = _('Add instance');

		// 自动生成唯一名字的 create 函数
		s.create = function (section_id) {
			let baseName = 'instance';
			let idx = 1;
			let newName = baseName + idx;

			// 通过 get() 先获取所有存在的实例名字，避免重复
			const existing = this.map.sections.map(s => s['.name']);

			while (existing.includes(newName)) {
				idx++;
				newName = baseName + idx;
			}

			// 调用原始 create 方法，传入新名字
			return form.TypedSection.prototype.create.call(this, newName);
		};

		s.handleRemove = function (section_id) {
			return L.resolveDefault(callServiceStop('msd_lite', section_id), 3000).then(() => {
				return form.TypedSection.prototype.handleRemove.call(this, section_id);
			}).catch((e) => {
				ui.addNotification(null, _('Failed to stop instance: ') + e.message);
				throw e; // 阻止删除操作
			});
		};

		// 状态显示字段
		s.option(form.DummyValue, '_status', _('Service Status')).cfgvalue = function (section_id) {
			poll.add(() => {
				return getInstanceStatus(section_id).then(running => {
					const view = document.getElementById('status_' + section_id);
					if (view)
						view.innerHTML = renderStatus(running);
				});
			});

			return `<div id="status_${section_id}">${_('Collecting data...')}</div>`;
		};

		// 下面正常添加字段...
		let o;

		o = s.option(form.ListValue, 'enabled', _('Enable'));
		o.value('1', _('Enabled'));
		o.value('0', _('Disabled'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.DynamicList, 'address', _('Bind address'));
		o.datatype = 'ipaddrport(1)';
		o.rmempty = false;

		o = s.option(widgets.NetworkSelect, 'network', _('Source interface'),
			_('Used for receiving multicast.'));
		o.nocreate = true;
		o.optional = true;

		o = s.option(form.Value, 'threads', _('Worker threads'),
			_('Set 0 or leave empty to auto detect.'));
		o.datatype = 'uinteger';
		o.default = '0';

		o = s.option(form.Flag, 'bind_to_cpu', _('Bind threads to CPUs'));
		o.default = o.disabled;

		o = s.option(form.Flag, 'drop_slow_clients', _('Disconnect slow clients'));
		o.default = o.disabled;

		o = s.option(form.Value, 'precache_size', _('Pre cache size'));
		o.datatype = 'uinteger';
		o.default = '4096';

		o = s.option(form.Value, 'ring_buffer_size', _('Ring buffer size'),
			_('Stream receive ring buffer size.'));
		o.datatype = 'uinteger';
		o.default = '1024';

		o = s.option(form.Value, 'multicast_recv_buffer_size', _('Receive buffer size'),
			_('Multicast socket receive buffer size.'));
		o.datatype = 'uinteger';
		o.default = '512';

		o = s.option(form.Value, 'multicast_recv_timeout', _('Receive timeout'),
			_('Multicast receive timeout (seconds).'));
		o.datatype = 'uinteger';
		o.default = '2';

		o = s.option(form.Value, 'rejoin_time', _('IGMP/MLD rejoin time'),
			_('IGMP/MLD leave+join interval in seconds. 0 disables.'));
		o.datatype = 'uinteger';
		o.default = '0';

		o = s.option(form.ListValue, 'loglevel', _('Log Level'),
			_('Syslog severity level: 0=emerg, 7=debug'));
		for (let i = 0; i <= 7; i++) {
			o.value(i.toString(), i.toString());
		}
		o.default = '0';

		return m.render();
	}
});
