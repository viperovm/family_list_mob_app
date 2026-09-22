pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Backend tests') {
            steps {
                dir('backend') {
                    sh 'python3 -m venv .venv'
                    sh '.venv/bin/pip install -r requirements.txt'
                    sh '.venv/bin/python manage.py test'
                }
            }
        }

        stage('Deploy backend (native)') {
            steps {
                sshagent(['deploy-ssh-key']) {
                    sh '''
                        rsync -az --delete \
                          --exclude .venv --exclude .env --exclude '*.sqlite3' \
                          --exclude staticfiles --exclude media --exclude __pycache__ \
                          backend/ deploy@listsapp.djangopirate.ru:/home/viperovm/family_list_mob_app/backend/
                        ssh deploy@listsapp.djangopirate.ru \
                          'bash /home/viperovm/family_list_mob_app/backend/deploy/deploy.sh'
                    '''
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
