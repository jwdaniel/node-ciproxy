#!/bin/sh

DIR=/home2/CIProxy
PROG=${DIR}/app
LOG=trigger.log

cd ${DIR}

start() {
        if [ ! -f ${LOG} ]; then
            touch ${LOG}
        fi
        date >> ${LOG}
        node ${PROG} >> ${LOG} 2>&1 &
}

stop() {
        ps axww | grep ${PROG} | grep -v grep | awk '{print $1}' | xargs kill
        sleep 1
        ps axww | grep ${PROG} | grep -v grep | awk '{print $1}' | xargs kill -9
}

restart() {
        stop
        sleep 5
        start
}

genconf() {
    TMPDIR=${DIR}/tmp
    ZIPF=/btrfs/package/Jenkins/jenkins-configs.zip
    CFGF=${DIR}/ciproxy.cfg

    cd "${DIR}"
    rm -rf "${TMPDIR}"
    mkdir -p "${TMPDIR}"

    mv -f ${CFGF} ${CFGF}.OLD
    (
        cd "${TMPDIR}"
        unzip ${ZIPF} >/dev/null 2>&1
        echo '{'
        grep '<url>' */config.xml | while read line ; do
            echo $line | awk '{ i = index($NF, "/fogbugz/kiln/Code"); j = index($0, "/config.xml"); \
                printf("    \"%s\": \"%s\",\n", substr($NF, i+18, length($NF)-i-24), substr($0, 0, j)); }'
        done
        echo '    "/Sandbox/JW/jenkins2": "sandbox-jenkins2"'
        echo '}'
    ) > ${CFGF}
}

case "$1" in
start)
        start
        ;;
stop)
        stop
        ;;
restart)
        restart
        ;;
check)
        ps axww | grep ${PROG} | grep -v grep
        if [ $? -ne 0 ]; then
            restart
        fi
        ;;
genconf)
        genconf
        restart
        ;;
*)
        ;;
esac

