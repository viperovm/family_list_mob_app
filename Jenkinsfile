pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'family-lists'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Backend tests') {
            steps {
                dir('backend') {
                    sh 'docker compose -f docker-compose.prod.yml run --rm web python manage.py test'
                }
            }
        }

        stage('Build & Deploy backend') {
            steps {
                dir('backend') {
                    withCredentials([file(credentialsId: 'backend-env-prod', variable: 'ENV_FILE')]) {
                        sh 'cp $ENV_FILE .env'
                    }
                    sh 'docker compose -f docker-compose.prod.yml up -d --build'
                }
            }
        }

        stage('Build mobile APK') {
            steps {
                dir('mobile') {
                    sh 'npm ci'
                    sh 'npx expo prebuild --platform android --clean'
                    sh 'cd android && ./gradlew assembleRelease'
                }
            }
        }

        stage('Archive APK') {
            steps {
                archiveArtifacts allowEmptyArchive: true,
                    artifacts: 'mobile/android/app/build/outputs/apk/**/app-release.apk'
            }
        }
    }

    post {
        success { echo 'Сборка завершена успешно.' }
        failure { echo 'Сборка завершилась с ошибкой.' }
    }
}