import { Body, Controller, Post } from '@nestjs/common';
import * as usersService from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: usersService.UsersService) {}

  @Post()
  create(@Body() CreateUserDto: usersService.CreateUserDto) {
    return this.usersService.createUser(CreateUserDto);
  }
}
