pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub-credentials'
        SONARQUBE_SERVER_NAME    = 'sonarqube-server'

        IMAGE_NAME = 'smartpark-ai'
        DOCKER_USER = 'ajithkumar31082004'

        EC2_HOST = '13.207.153.69'
        EC2_USER = 'ubuntu'

        SSH_CREDENTIALS_ID = 'ec2-ssh-key'

        APP_CONTAINER = 'smartpark_ai_service'
        APP_PORT = '5000'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {

        stage('1. Checkout') {
            steps {
                echo '📥 Checking out source code...'
                checkout scm
            }
        }

        stage('2. Install & Test') {
            steps {
                echo '🧪 Installing dependencies and running tests...'

                sh '''
                    npm ci
                    npm test
                '''
            }
        }

        stage('3. SonarQube Analysis') {
            steps {
                echo '🔍 Running SonarQube analysis...'

                script {
                    withSonarQubeEnv("${SONARQUBE_SERVER_NAME}") {
                        sh '''
                            sonar-scanner \
                              -Dsonar.projectKey=smartpark-car \
                              -Dsonar.projectName="SmartPark AI" \
                              -Dsonar.sources=. \
                              -Dsonar.exclusions=node_modules/**,coverage/**,dist/** \
                              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        '''
                    }
                }
            }
        }

        stage('4. Docker Build') {
            steps {
                echo '🐳 Building Docker image...'

                sh '''
                    docker build \
                      -t ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER} \
                      -t ${DOCKER_USER}/${IMAGE_NAME}:latest .
                '''
            }
        }

        stage('5. Trivy Scan') {
            steps {
                echo '🛡️ Scanning Docker image with Trivy...'

                sh '''
                    trivy image \
                      --severity HIGH,CRITICAL \
                      ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('6. Docker Hub Push') {
            steps {
                echo '🚀 Pushing Docker image...'

                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                            usernameVariable: 'DOCKER_LOGIN_USER',
                            passwordVariable: 'DOCKER_PASS'
                        )
                    ]) {
                        sh '''
                            echo "$DOCKER_PASS" | docker login \
                              -u "$DOCKER_LOGIN_USER" \
                              --password-stdin

                            docker push ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER}
                            docker push ${DOCKER_USER}/${IMAGE_NAME}:latest

                            docker logout
                        '''
                    }
                }
            }
        }

        stage('7. Deploy App Only') {
            steps {
                echo '🌐 Deploying SmartPark application only...'

                script {
                    sshagent(credentials: ["${SSH_CREDENTIALS_ID}"]) {

                        sh """
                            ssh -o StrictHostKeyChecking=no \
                                ${EC2_USER}@${EC2_HOST} '

                                set -e

                                cd /home/ubuntu/smart-parking-car

                                echo "📦 Pulling new image..."

                                docker pull ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER}

                                echo "🔍 Saving previous image..."

                                PREVIOUS_IMAGE=\$(docker inspect \
                                  -f "{{.Config.Image}}" \
                                  ${APP_CONTAINER} 2>/dev/null || true)

                                echo "Previous image: \$PREVIOUS_IMAGE"

                                echo "🚀 Starting new SmartPark application..."

                                DOCKER_IMAGE=${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER} \
                                docker compose \
                                  -f docker-compose.prod.yml \
                                  up -d \
                                  --no-deps \
                                  smartpark-app

                                echo "⏳ Waiting for application..."

                                sleep 10

                                echo "🏥 Running health check..."

                                if curl -fsS \
                                  http://localhost:${APP_PORT}/metrics \
                                  > /dev/null
                                then

                                    echo "✅ Health check PASSED"

                                else

                                    echo "❌ Health check FAILED"

                                    echo "🔄 Starting rollback..."

                                    if [ -n "\$PREVIOUS_IMAGE" ]
                                    then

                                        DOCKER_IMAGE=\$PREVIOUS_IMAGE \
                                        docker compose \
                                          -f docker-compose.prod.yml \
                                          up -d \
                                          --no-deps \
                                          smartpark-app

                                        echo "↩️ Rollback completed"

                                    else

                                        echo "⚠️ No previous image available"

                                    fi

                                    exit 1

                                fi

                                echo "📊 Current containers:"

                                docker ps

                                echo "🧹 Cleaning unused images..."

                                docker image prune -f

                            '
                        """
                    }
                }
            }
        }
    }

    post {

        always {
            echo '🧹 Cleaning Jenkins workspace...'
            cleanWs()
        }

        success {
            echo '✅ SmartPark Jenkins deployment completed successfully!'
        }

        failure {
            echo '❌ Jenkins pipeline failed!'
            echo '🔎 Check the failed stage and console output.'
        }
    }
}
