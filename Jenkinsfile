pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub-credentials'
        SONARQUBE_SERVER_NAME    = 'sonarqube-server'
        IMAGE_NAME               = 'smartpark-ai'
        DOCKER_USER              = 'ajithkumar31082004' // Change to your Docker Hub username
        EC2_HOST                 = '18.204.200.12'      // Change to your EC2 public IP/DNS
        EC2_USER                 = 'ubuntu'
        SSH_CREDENTIALS_ID       = 'ec2-ssh-key'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('1. Checkout Source Code') {
            steps {
                echo "📥 Checking out source code from Git..."
                checkout scm
            }
        }

        stage('2. Install & Test') {
            steps {
                echo "🧪 Installing Node dependencies & running unit tests..."
                sh '''
                    npm ci
                    npm test
                '''
            }
        }

        stage('3. SonarQube Code Analysis') {
            steps {
                echo "🔍 Running SonarQube Code Quality & Security Scan..."
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
                echo "🐳 Building Docker image..."
                sh '''
                    docker build -t ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER} -t ${DOCKER_USER}/${IMAGE_NAME}:latest .
                '''
            }
        }

        stage('5. Trivy Vulnerability Scan') {
            steps {
                echo "🛡️ Running Trivy Scan on Docker Image..."
                sh '''
                    trivy image --severity HIGH,CRITICAL ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('6. Docker Hub Push') {
            steps {
                echo "🚀 Pushing Docker Image to Docker Hub..."
                script {
                    withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS_ID}", passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER_ENV')]) {
                        sh '''
                            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER_ENV" --password-stdin
                            docker push ${DOCKER_USER}/${IMAGE_NAME}:${BUILD_NUMBER}
                            docker push ${DOCKER_USER}/${IMAGE_NAME}:latest
                        '''
                    }
                }
            }
        }

        stage('7. Deploy to AWS EC2') {
            steps {
                echo "🌐 Deploying to AWS EC2 via SSH..."
                script {
                    sshagent(credentials: ["${SSH_CREDENTIALS_ID}"]) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                                set -e
                                cd /home/ubuntu/smart-parking-car || exit 1
                                docker pull ${DOCKER_USER}/${IMAGE_NAME}:latest
                                docker compose -f docker-compose.prod.yml down || true
                                docker compose -f docker-compose.prod.yml up -d
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
            echo "🧹 Cleaning up workspace..."
            cleanWs()
        }
        success {
            echo "✅ Jenkins Pipeline completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed! Check stage logs for details."
        }
    }
}
