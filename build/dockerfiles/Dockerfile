# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM docker.io/node:18.19.1-alpine3.19 as builder
ARG SL_TOKEN=''
ENV SL_TOKEN=$SL_TOKEN

ARG SL_BUILD_NAME=''
ENV SL_BUILD_NAME=$SL_BUILD_NAME

ARG SL_BUILD_ID=''
ENV SL_BUILD_ID=$SL_BUILD_ID

# hadolint ignore=DL3018
RUN apk add --no-cache python3 make g++

# hadolint ignore=DL3059,SC1072
RUN if ! [ type "yarn" &> /dev/null ]; then \
        apk add yarn --no-cache; \
    fi

COPY package.json /dashboard/
COPY yarn.lock /dashboard/
COPY lerna.json /dashboard/
COPY tsconfig.json /dashboard/

ENV COMMON=packages/common
COPY ${COMMON}/package.json /dashboard/${COMMON}/

ENV FRONTEND=packages/dashboard-frontend
COPY ${FRONTEND}/package.json /dashboard/${FRONTEND}/

ENV BACKEND=packages/dashboard-backend
COPY ${BACKEND}/package.json /dashboard/${BACKEND}/

WORKDIR /dashboard
RUN yarn install --network-timeout 3600000
COPY packages/ /dashboard/packages
RUN yarn build:dev

# enable sealights agent to scan the project sources, and inject the code with

ENV NODE_DEBUG=sl

RUN yarn add slnodejs -W && \
    yarn slnodejs config --token ${SL_TOKEN} --appname ${SL_BUILD_NAME} --branch "main" --build ${SL_BUILD_ID} && \
    yarn slnodejs scan --token ${SL_TOKEN} --buildsessionidfile buildSessionId --instrumentForBrowsers --workspacepath /dashboard/${FRONTEND}/lib --outputpath /dashboard/${FRONTEND}/sl_lib --scm none --uniqueModuleId frontend-package --labid sealightspoclab && \
    yarn slnodejs scan --token ${SL_TOKEN} --buildsessionidfile buildSessionId --workspacepath /dashboard/${BACKEND}/lib --outputpath /dashboard/${BACKEND}/sl_lib --scm none --uniqueModuleId backend-package && \
    yarn slnodejs scan --token ${SL_TOKEN} --buildsessionidfile buildSessionId --workspacepath /dashboard/${COMMON}/lib --outputpath /dashboard/${COMMON}/sl_lib --scm none --uniqueModuleId common-package && \
    yarn slnodejs buildend --token ${SL_TOKEN} --buildsessionidfile buildSessionId --ok

RUN mv /dashboard/${FRONTEND}/lib /dashboard/${FRONTEND}/lib_original && \
    mv /dashboard/${FRONTEND}/sl_lib /dashboard/${FRONTEND}/lib

# leave only production dependencies
RUN yarn workspace @eclipse-che/dashboard-backend install --production

FROM docker.io/node:18.19.1-alpine3.19

ARG SL_TOKEN=''
ENV SL_TOKEN=$SL_TOKEN

RUN apk --no-cache add curl

ENV FRONTEND_LIB=/dashboard/packages/dashboard-frontend/lib/public
ENV BACKEND_LIB=/dashboard/packages/dashboard-backend/lib
ENV BACKEND_NODE_MODULES=/dashboard/packages/dashboard-backend/node_modules/
ENV DEVFILE_REGISTRY=/dashboard/packages/devfile-registry

RUN npm install --loglevel=error slnodejs

COPY --from=builder ${BACKEND_LIB} /backend
COPY --from=builder /dashboard/buildSessionId /buildSessionId
COPY --from=builder ${BACKEND_NODE_MODULES} /backend/node_modules
COPY --from=builder ${FRONTEND_LIB} /public
COPY --from=builder ${DEVFILE_REGISTRY} /public/dashboard/devfile-registry

COPY build/dockerfiles/entrypoint.sh /entrypoint.sh

EXPOSE 80
EXPOSE 443

ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "sh" ]
