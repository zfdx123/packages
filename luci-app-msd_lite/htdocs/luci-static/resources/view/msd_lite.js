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

function getServiceStatus() {
    return L.resolveDefault(callServiceList('msd_lite'), {}).then((res) => {
        var isRunning = false;
        try {
            isRunning = res['msd_lite']?.['instances']?.['msd_lite']?.['running'] || false;
        } catch (e) {
            console.error('Error checking service status:', e);
        }
        return isRunning;
    });
}

function renderStatus(isRunning) {
    var spanTemp = '<em><span style="color:%s"><strong>%s (%s) %s</strong></span></em>';
    var renderHTML;
    if (isRunning)
        renderHTML = spanTemp.format('green', _('msd_lite'), _('Running'));
    else
        renderHTML = spanTemp.format('red', _('msd_lite'), _('Not Running'));

    return renderHTML;
}

return view.extend({
    load: function() {
        return Promise.all([
            uci.load('msd_lite')
        ]);
    },

    render: function() {
        var m, s, o;

        m = new form.Map('msd_lite', _('Multi Stream daemon Lite'),
            _('The lightweight version of Multi Stream daemon (msd) for organizing IPTV streaming over HTTP.'));

        // Status section
        s = m.section(form.TypedSection, null, _('Service Status'));
        s.anonymous = true;
        s.render = function() {
            poll.add(function() {
                return L.resolveDefault(getServiceStatus()).then((res) => {
                    var view = document.getElementById('service_status');
                    if (view) {
                        view.innerHTML = renderStatus(res);
                    }
                });
            }, 5);

            return E('div', { class: 'cbi-section', id: 'status_bar' }, [
                E('p', { id: 'service_status' }, _('Collecting data...'))
            ]);
        }

        // Configuration section
        s = m.section(form.TypedSection, 'msd_lite', _('Basic Settings'));
        s.anonymous = false;
        s.addremove = false;

        o = s.option(form.Flag, 'enabled', _('Enable'), _('Enable Msd_lite service'));
        o.rmempty = false;

        o = s.option(form.DynamicList, 'address', _('Bind address'));
        o.datatype = 'ipaddrport';
        o.rmempty = false;
        o.placeholder = '0.0.0.0:8080';

        o = s.option(widgets.NetworkSelect, 'network', _('Source interface'),
            _('Used for receiving multicast.'));
        o.nocreate = true;
        o.optional = true;

        o = s.option(form.Value, 'threads', _('Worker threads'),
            _('Set 0 or leave empty to auto detect.'));
        o.datatype = 'uinteger';
        o.placeholder = '0';

        o = s.option(form.Flag, 'bind_to_cpu', _('Bind threads to CPUs'));
        o.default = o.disabled;

        o = s.option(form.Flag, 'drop_slow_clients', _('Disconnect slow clients'));
        o.default = o.disabled;

        o = s.option(form.Value, 'precache_size', _('Pre cache size'));
        o.datatype = 'uinteger';
        o.placeholder = '4096';

        o = s.option(form.Value, 'ring_buffer_size', _('Ring buffer size'),
            _('Stream receive ring buffer size.'));
        o.datatype = 'uinteger';
        o.placeholder = '1024';

        o = s.option(form.Value, 'multicast_recv_buffer_size', _('Receive buffer size'),
            _('Multicast socket receive buffer size.'));
        o.datatype = 'uinteger';
        o.placeholder = '512';

        o = s.option(form.Value, 'multicast_recv_timeout', _('Receive timeout'),
            _('Multicast receive timeout (seconds).'));
        o.datatype = 'uinteger';
        o.placeholder = '2';

        o = s.option(form.Value, 'rejoin_time', _('IGMP/MLD rejoin time'),
            _('IGMP/MLD leave+join interval in seconds. 0 disables.'));
        o.datatype = 'uinteger';
        o.placeholder = '0';

        o = s.option(form.ListValue, 'loglevel', _('Log Level'),
            _('Syslog severity level: 0=emerg, 7=debug'));
        for (let i = 0; i <= 7; i++) {
            o.value(i.toString(), i.toString());
        }
        o.default = '0';

        return m.render();
    },

    handleSaveApply: null,
    handleReset: null
});
