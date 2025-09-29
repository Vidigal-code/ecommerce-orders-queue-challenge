import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    await app.listen(process.env.PORT || 3000);

    function blue(text: string): string {
        return `\x1b[34m${text}\x1b[0m`;
    }

    console.log(blue(`Server running on http://localhost:${process.env.PORT || 3000}  Created by https://github.com/Vidigal-code`));
}

bootstrap();